-- Private, application-scoped conversations between an applicant and the job's recruiter.
-- Run after the existing application and job migrations.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  recipient_id uuid not null references auth.users(id),
  body text not null check (length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists messages_application_created_idx on public.messages (application_id, created_at);
create index if not exists messages_recipient_unread_idx on public.messages (recipient_id, application_id) where read_at is null;
alter table public.messages enable row level security;

create or replace function public.prepare_application_message()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_candidate uuid;
  v_recruiter uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to send a message.'; end if;
  select a.candidate_id, j.recruiter_id into v_candidate, v_recruiter
    from public.applications a join public.job_postings j on j.id = a.job_id
    where a.id = new.application_id;
  if not found or auth.uid() not in (v_candidate, v_recruiter) then
    raise exception 'This conversation is not available.';
  end if;
  new.sender_id := auth.uid();
  new.recipient_id := case when auth.uid() = v_candidate then v_recruiter else v_candidate end;
  new.body := btrim(new.body);
  new.created_at := now();
  new.read_at := null;
  return new;
end;
$$;

drop trigger if exists messages_prepare_insert on public.messages;
create trigger messages_prepare_insert before insert on public.messages
  for each row execute function public.prepare_application_message();

drop policy if exists "Conversation participants can read messages" on public.messages;
create policy "Conversation participants can read messages" on public.messages
  for select to authenticated using (
    sender_id = auth.uid() or recipient_id = auth.uid()
  );

drop policy if exists "Conversation participants can send messages" on public.messages;
create policy "Conversation participants can send messages" on public.messages
  for insert to authenticated with check (
    -- The before-insert trigger verifies the application and sets both user IDs.
    sender_id = auth.uid()
  );

grant select, insert on public.messages to authenticated;

create or replace function public.unread_message_count()
returns bigint language sql stable security definer set search_path = public, pg_temp as $$
  select count(*) from public.messages
  where recipient_id = auth.uid() and read_at is null;
$$;

create or replace function public.mark_conversation_read(p_application_id uuid)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_count integer;
begin
  update public.messages set read_at = now()
    where application_id = p_application_id and recipient_id = auth.uid() and read_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.list_conversations(p_application_id uuid default null)
returns table (
  application_id uuid,
  job_title text,
  application_status text,
  my_role text,
  other_name text,
  last_message text,
  last_message_at timestamptz,
  unread_count bigint
) language sql stable security definer set search_path = public, pg_temp as $$
  select
    a.id,
    j.title::text,
    a.status::text,
    case when a.candidate_id = auth.uid() then 'candidate' else 'recruiter' end,
    case when a.candidate_id = auth.uid() then
      coalesce(nullif(btrim(e."companyName"), ''), 'Recruiter')
    else
      coalesce(nullif(btrim(concat_ws(' ', p."firstName", p."lastName")), ''),
               nullif(a.applicant_details->>'fullName', ''), 'Candidate')
    end,
    last_message.body,
    last_message.created_at,
    (select count(*) from public.messages unread
      where unread.application_id = a.id and unread.recipient_id = auth.uid() and unread.read_at is null)
  from public.applications a
  join public.job_postings j on j.id = a.job_id
  left join public.candidate_profiles p on p.id = a.candidate_id
  left join public.employers e on e.id = j.recruiter_id
  left join lateral (
    select m.body, m.created_at from public.messages m
    where m.application_id = a.id order by m.created_at desc, m.id desc limit 1
  ) last_message on true
  where auth.uid() in (a.candidate_id, j.recruiter_id)
    and (p_application_id is null or a.id = p_application_id)
  order by last_message.created_at desc nulls last, a.applied_at desc;
$$;

revoke all on function public.unread_message_count() from public;
revoke all on function public.mark_conversation_read(uuid) from public;
revoke all on function public.list_conversations(uuid) from public;
grant execute on function public.unread_message_count() to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.list_conversations(uuid) to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
