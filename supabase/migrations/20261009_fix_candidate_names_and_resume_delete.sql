-- ResuMatch: run once in Supabase Dashboard > SQL Editor.
-- Fixes "Unknown" candidate names on the recruiter side and allows candidates to delete their resume.
-- Safe to re-run: every statement checks before creating.

-- 1) Backfill: create a candidate_profiles row for job seekers who signed up by email
--    (email sign-up never inserted one, so recruiters saw "Unknown").
insert into public.candidate_profiles (id, email, "firstName", "lastName")
select
  u.id,
  u.email,
  split_part(trim(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')), ' ', 1),
  nullif(regexp_replace(trim(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')), '^\S+\s*', ''), '')
from auth.users u
where u.raw_user_meta_data->>'role' = 'job_seeker'
  and not exists (select 1 from public.candidate_profiles p where p.id = u.id);

-- 2) Fill in blank names on profiles that already exist.
update public.candidate_profiles p
set "firstName" = coalesce(nullif(p."firstName", ''), split_part(trim(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')), ' ', 1)),
    "lastName"  = coalesce(nullif(p."lastName", ''),  nullif(regexp_replace(trim(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')), '^\S+\s*', ''), '')),
    email       = coalesce(p.email, u.email)
from auth.users u
where u.id = p.id
  and (p."firstName" is null or p."firstName" = '' or p."lastName" is null or p."lastName" = '');

-- 3) RLS: a recruiter may read the profile of a candidate who applied to one of their jobs.
--    Without this, the profile join on applications returns null and the UI showed "Unknown".
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'candidate_profiles'
                 and policyname = 'Recruiters can read applicant profiles') then
    create policy "Recruiters can read applicant profiles"
      on public.candidate_profiles for select to authenticated
      using (exists (
        select 1 from public.applications a
        join public.job_postings j on j.id = a.job_id
        where a.candidate_id = candidate_profiles.id
          and j.recruiter_id = auth.uid()
      ));
  end if;
end $$;

-- 4) RLS: signed-in users can read company names (used in the candidate's application history).
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'employers'
                 and policyname = 'Authenticated users can read company names') then
    create policy "Authenticated users can read company names"
      on public.employers for select to authenticated using (true);
  end if;
end $$;

-- 5) Storage: a candidate may delete their own resume file (<user id>-resume.<ext>) from the 'resumes' bucket.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                 and policyname = 'Candidates can delete own resume') then
    create policy "Candidates can delete own resume"
      on storage.objects for delete to authenticated
      using (bucket_id = 'resumes' and name like auth.uid()::text || '-%');
  end if;
end $$;
