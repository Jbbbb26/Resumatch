-- Candidate application details, guarded applications, and applicant attachment reads.
-- Apply after the archive/hiring-status and job-attachment migrations.

alter table public.applications
  add column if not exists applicant_details jsonb;

drop policy if exists "Authenticated users can read open job postings" on public.job_postings;
drop policy if exists "Authenticated users can read non-archived job postings" on public.job_postings;
create policy "Authenticated users can read non-archived job postings"
  on public.job_postings for select to authenticated
  using (
    recruiter_id = auth.uid()
    or (
      coalesce(status, 'active') = 'active'
      and coalesce(is_archived, false) = false
    )
  );

create or replace function public.can_read_job_attachments(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.job_postings j
    where j.id = p_job_id
      and coalesce(j.status, 'active') = 'active'
      and coalesce(j.is_archived, false) = false
      and coalesce(j.hiring_status, 'open') = 'open'
  ) or exists (
    select 1
    from public.applications a
    where a.job_id = p_job_id
      and a.candidate_id = auth.uid()
  );
$$;

revoke all on function public.can_read_job_attachments(uuid) from public;
grant execute on function public.can_read_job_attachments(uuid) to authenticated;

drop policy if exists "Recruiters can read attachments for their jobs" on public.job_listing_attachments;
create policy "Recruiters can read attachments for their jobs"
  on public.job_listing_attachments for select to authenticated
  using (
    exists (
      select 1
      from public.job_postings j
      where j.id = job_listing_attachments.job_id
        and j.recruiter_id = auth.uid()
    )
    or public.can_read_job_attachments(job_listing_attachments.job_id)
  );

drop policy if exists "Candidates can read visible job attachment files" on storage.objects;
create policy "Candidates can read visible job attachment files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'job-attachments'
    and exists (
      select 1
      from public.job_listing_attachments a
      where a.file_path = name
        and public.can_read_job_attachments(a.job_id)
    )
  );

create or replace function public.apply_to_job(
  p_job_id uuid,
  p_match_score numeric,
  p_applicant_details jsonb
)
returns public.applications
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  app public.applications;
  v_candidate_id uuid := auth.uid();
begin
  if v_candidate_id is null
     or not exists (
       select 1 from auth.users u
       where u.id = v_candidate_id
         and u.raw_user_meta_data->>'role' = 'job_seeker'
     ) then
    raise exception 'Only signed-in candidates can apply.';
  end if;

  if jsonb_typeof(p_applicant_details) is distinct from 'object' then
    raise exception 'Application details must be a JSON object.';
  end if;

  if not exists (
    select 1 from public.job_postings j
    where j.id = p_job_id
      and coalesce(j.status, 'active') = 'active'
      and coalesce(j.is_archived, false) = false
      and coalesce(j.hiring_status, 'open') = 'open'
  ) then
    raise exception 'This position is no longer accepting applications.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_candidate_id::text || p_job_id::text, 0));

  select * into app
  from public.applications a
  where a.candidate_id = v_candidate_id
    and a.job_id = p_job_id
  for update;

  if found then
    if app.status is distinct from 'Rejected' then
      raise exception 'You already have an active application for this position.';
    end if;
    if coalesce(app.status_updated_at, app.applied_at) + interval '30 days' > now() then
      raise exception 'You can re-apply after the 30-day cooldown.';
    end if;

    update public.applications
    set status = 'Applied',
        applied_at = now(),
        match_score = coalesce(p_match_score, match_score),
        applicant_details = p_applicant_details,
        stage = 'applied',
        rejection_reason = null
    where id = app.id
    returning * into app;
    return app;
  end if;

  insert into public.applications (
    candidate_id, job_id, match_score, status, applicant_details
  )
  values (
    v_candidate_id, p_job_id, coalesce(p_match_score, 0), 'Applied', p_applicant_details
  )
  returning * into app;

  return app;
end;
$$;

revoke all on function public.apply_to_job(uuid, numeric, jsonb) from public;
grant execute on function public.apply_to_job(uuid, numeric, jsonb) to authenticated;
