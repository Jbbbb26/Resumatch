-- ResuMatch: run once in Supabase Dashboard > SQL Editor (after 20261009_fix_candidate_names_and_resume_delete.sql).
-- Apply-once / re-apply rules:
--   * A candidate has at most one application per job.
--   * The recruiter sets the outcome (Applied / Interview / Hired / Rejected) from the Review popup.
--   * After "Rejected", the candidate may re-apply once 30 days have passed since the decision,
--     as long as the job is still active. Re-applying reuses the same row (status back to 'Applied').
-- Safe to re-run.

-- 1) Track when the status last changed (the cooldown is counted from this).
alter table public.applications add column if not exists status_updated_at timestamptz default now();
update public.applications set status_updated_at = coalesce(status_updated_at, applied_at, now());

create or replace function public.touch_application_status()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    new.status_updated_at := now();
  end if;
  return new;
end $$;

drop trigger if exists applications_status_touch on public.applications;
create trigger applications_status_touch
  before update on public.applications
  for each row execute function public.touch_application_status();

-- 2) One application per candidate per job (only created if there are no existing duplicates).
do $$
begin
  if exists (
    select 1 from public.applications group by candidate_id, job_id having count(*) > 1
  ) then
    raise notice 'Duplicate applications exist; unique index NOT created. Remove duplicates, then re-run this script.';
  elsif not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'applications_candidate_job_unique') then
    create unique index applications_candidate_job_unique on public.applications (candidate_id, job_id);
  end if;
end $$;

-- 3) Recruiters can update applications to their own jobs (used to set Interview / Hired / Rejected).
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'applications'
                 and policyname = 'Recruiters can update applications to their jobs') then
    create policy "Recruiters can update applications to their jobs"
      on public.applications for update to authenticated
      using (exists (select 1 from public.job_postings j where j.id = applications.job_id and j.recruiter_id = auth.uid()))
      with check (exists (select 1 from public.job_postings j where j.id = applications.job_id and j.recruiter_id = auth.uid()));
  end if;
end $$;

-- 4) Re-apply. Candidates cannot edit their application row directly (they could set their own status),
--    so re-applying goes through this function, which enforces the rules server-side.
create or replace function public.reapply_to_job(
  p_job_id public.applications.job_id%type,
  p_match_score numeric default null
)
returns public.applications
language plpgsql
security definer
set search_path = public
as $$
declare
  app public.applications;
  cooldown constant interval := interval '30 days';  -- keep in sync with REAPPLY_COOLDOWN_DAYS in CandidateDashboard.jsx
begin
  select * into app from public.applications
   where candidate_id = auth.uid() and job_id = p_job_id
   order by applied_at desc limit 1
   for update;

  if not found then
    raise exception 'You have not applied to this position yet.';
  end if;
  if app.status is distinct from 'Rejected' then
    raise exception 'You already have an active application for this position.';
  end if;
  if coalesce(app.status_updated_at, app.applied_at) + cooldown > now() then
    raise exception 'You can re-apply from %.', to_char(coalesce(app.status_updated_at, app.applied_at) + cooldown, 'Mon DD, YYYY');
  end if;
  if not exists (select 1 from public.job_postings where id = p_job_id and coalesce(status, 'active') = 'active') then
    raise exception 'This position is no longer open.';
  end if;

  update public.applications
     set status = 'Applied',
         applied_at = now(),
         match_score = coalesce(p_match_score, match_score)
   where id = app.id
  returning * into app;

  return app;
end $$;

revoke all on function public.reapply_to_job(public.applications.job_id%type, numeric) from public;
grant execute on function public.reapply_to_job(public.applications.job_id%type, numeric) to authenticated;

-- 5) Company profile popup for candidates: they need to read other active job postings of a company.
--    (Skip if your job_postings table already allows authenticated users to select.)
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'job_postings'
                 and policyname = 'Authenticated users can read active job postings') then
    create policy "Authenticated users can read active job postings"
      on public.job_postings for select to authenticated
      using (coalesce(status, 'active') = 'active' or recruiter_id = auth.uid());
  end if;
end $$;
