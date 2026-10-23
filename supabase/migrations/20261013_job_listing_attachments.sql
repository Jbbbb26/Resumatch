-- Private recruiter job attachments with ownership and candidate visibility policies.
-- Apply after 20261013_job_listing_archive_and_hiring_status.sql.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-attachments',
  'job-attachments',
  false,
  5242880,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.job_listing_attachments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_postings(id) on delete cascade,
  file_name text not null,
  file_path text not null unique,
  file_size bigint not null check (file_size > 0 and file_size <= 5242880),
  mime_type text not null check (mime_type in (
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  )),
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.job_listing_attachments enable row level security;
grant select, insert, update, delete on table public.job_listing_attachments to authenticated;

drop policy if exists "Recruiters can read attachments for their jobs" on public.job_listing_attachments;
create policy "Recruiters can read attachments for their jobs"
  on public.job_listing_attachments for select to authenticated
  using (
    exists (
      select 1 from public.job_postings j
      where j.id = job_listing_attachments.job_id and j.recruiter_id = auth.uid()
    )
    or exists (
      select 1 from public.job_postings j
      where j.id = job_listing_attachments.job_id
        and coalesce(j.status, 'active') = 'active'
        and coalesce(j.is_archived, false) = false
        and coalesce(j.hiring_status, 'open') = 'open'
    )
  );

drop policy if exists "Recruiters can insert attachments for their jobs" on public.job_listing_attachments;
create policy "Recruiters can insert attachments for their jobs"
  on public.job_listing_attachments for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.job_postings j
      where j.id = job_listing_attachments.job_id and j.recruiter_id = auth.uid()
    )
  );

drop policy if exists "Recruiters can update attachments for their jobs" on public.job_listing_attachments;
create policy "Recruiters can update attachments for their jobs"
  on public.job_listing_attachments for update to authenticated
  using (exists (
    select 1 from public.job_postings j
    where j.id = job_listing_attachments.job_id and j.recruiter_id = auth.uid()
  ))
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.job_postings j
      where j.id = job_listing_attachments.job_id and j.recruiter_id = auth.uid()
    )
  );

drop policy if exists "Recruiters can delete attachments for their jobs" on public.job_listing_attachments;
create policy "Recruiters can delete attachments for their jobs"
  on public.job_listing_attachments for delete to authenticated
  using (exists (
    select 1 from public.job_postings j
    where j.id = job_listing_attachments.job_id and j.recruiter_id = auth.uid()
  ));

drop policy if exists "Recruiters can upload job attachment files" on storage.objects;
create policy "Recruiters can upload job attachment files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'job-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.job_postings j
      where j.id::text = (storage.foldername(name))[2]
        and j.recruiter_id = auth.uid()
    )
  );

drop policy if exists "Recruiters can update job attachment files" on storage.objects;
create policy "Recruiters can update job attachment files"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'job-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.job_postings j
      where j.id::text = (storage.foldername(name))[2]
        and j.recruiter_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'job-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.job_postings j
      where j.id::text = (storage.foldername(name))[2]
        and j.recruiter_id = auth.uid()
    )
  );

drop policy if exists "Recruiters can delete job attachment files" on storage.objects;
create policy "Recruiters can delete job attachment files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'job-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.job_postings j
      where j.id::text = (storage.foldername(name))[2]
        and j.recruiter_id = auth.uid()
    )
  );

drop policy if exists "Recruiters can read own job attachment files" on storage.objects;
create policy "Recruiters can read own job attachment files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'job-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.job_postings j
      where j.id::text = (storage.foldername(name))[2]
        and j.recruiter_id = auth.uid()
    )
  );

drop policy if exists "Candidates can read visible job attachment files" on storage.objects;
create policy "Candidates can read visible job attachment files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'job-attachments'
    and exists (
      select 1
      from public.job_listing_attachments a
      join public.job_postings j on j.id = a.job_id
      where a.file_path = name
        and coalesce(j.status, 'active') = 'active'
        and coalesce(j.is_archived, false) = false
        and coalesce(j.hiring_status, 'open') = 'open'
    )
  );
