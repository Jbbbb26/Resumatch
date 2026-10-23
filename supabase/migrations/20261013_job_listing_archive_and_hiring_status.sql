-- Add recruiter-controlled hiring status and reversible job archiving.
-- Safe to re-run; existing listings remain available and default to open.

alter table public.job_postings
  add column if not exists hiring_status text not null default 'open',
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz,
  add column if not exists closed_at timestamptz;

update public.job_postings
set hiring_status = coalesce(hiring_status, 'open'),
    is_archived = coalesce(is_archived, false)
where hiring_status is null or is_archived is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'job_postings_hiring_status_check'
      and conrelid = 'public.job_postings'::regclass
  ) then
    alter table public.job_postings
      add constraint job_postings_hiring_status_check check (hiring_status in ('open', 'closed'));
  end if;
end $$;

-- Candidate-facing reads may only see open, non-archived jobs. Recruiters can
-- still read their own listings in every state.
drop policy if exists "Authenticated users can read active job postings" on public.job_postings;
drop policy if exists "Authenticated users can read open job postings" on public.job_postings;
create policy "Authenticated users can read open job postings"
  on public.job_postings for select to authenticated
  using (
    recruiter_id = auth.uid()
    or (
      coalesce(status, 'active') = 'active'
      and coalesce(is_archived, false) = false
      and coalesce(hiring_status, 'open') = 'open'
    )
  );

create or replace function public.prevent_application_to_closed_job()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  should_validate boolean;
begin
  if tg_op = 'INSERT' then
    should_validate := true;
  else
    should_validate := new.status = 'Applied'
      and (old.status is distinct from new.status or old.job_id is distinct from new.job_id);
  end if;

  if should_validate then
    if not exists (
      select 1
      from public.job_postings
      where id = new.job_id
        and coalesce(status, 'active') = 'active'
        and coalesce(is_archived, false) = false
        and coalesce(hiring_status, 'open') = 'open'
    ) then
      raise exception 'This position is no longer accepting applications.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists applications_require_open_job on public.applications;
create trigger applications_require_open_job
  before insert or update of status, job_id on public.applications
  for each row execute function public.prevent_application_to_closed_job();
