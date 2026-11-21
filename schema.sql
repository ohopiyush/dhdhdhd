-- TECHNOVA 2026 schema. Run in Supabase > SQL Editor.
create extension if not exists pgcrypto;
create table events(slug text primary key, name text not null, venue text not null, max_team_size int default 4, deadline timestamptz not null, allowed_types text[] default '{individual,team}', sort_order int);
create table registrations(id uuid primary key default gen_random_uuid(), reg_id text unique not null, name text, email text, enrollment_no text, phone text, department text, year text, event_slug text references events(slug), participation_type text, team_name text, team_size int default 1, created_at timestamptz default now(), unique(email,event_slug), unique(enrollment_no,event_slug));
create table team_members(id uuid primary key default gen_random_uuid(), registration_id uuid references registrations(id) on delete cascade, event_slug text, name text, enrollment_no text, phone text, unique(enrollment_no,event_slug));
create table organisers(username text unique, password_hash text);
create sequence reg_seq;
alter table events enable row level security; alter table registrations enable row level security;
alter table team_members enable row level security; alter table organisers enable row level security;
create policy "public read events" on events for select using (true);  -- the only direct table access

insert into events values
('robo-wars','Robo Wars','Stage Garden',4,'2026-12-15 23:59+05:30','{individual,team}',1),
('code-clash','Code Clash','Conclave Centre',4,'2026-12-15 23:59+05:30','{individual,team}',2),
('circuitrix','Circuitrix','J115, 1st Floor, Electronics Department',4,'2026-12-15 23:59+05:30','{individual,team}',3),
('tech-quiz','Tech Quiz','Colloquium Hall',4,'2026-12-15 23:59+05:30','{individual,team}',4);
-- To demo "closed": update events set deadline = now() - interval '1 day' where slug='tech-quiz';

create or replace function register_participant(p jsonb) returns jsonb
language plpgsql security definer set search_path=public,extensions as $$
declare ev events; rid uuid; code text; m jsonb; n int; team boolean := (p->>'type')='team';
begin
  select * into ev from events where slug=p->>'event';
  if not found then return jsonb_build_object('error','NO_EVENT'); end if;
  if now() > ev.deadline then return jsonb_build_object('error','CLOSED'); end if;
  if not ((p->>'type') = any(ev.allowed_types)) then return jsonb_build_object('error','BAD_TYPE'); end if;
  n := case when team then (p->>'team_size')::int else 1 end;
  if n>ev.max_team_size or (team and (n<2 or jsonb_array_length(coalesce(p->'members','[]'))<>n-1)) then
    return jsonb_build_object('error','BAD_SIZE'); end if;
  if exists(select 1 from registrations where event_slug=ev.slug and (lower(email)=lower(p->>'email') or enrollment_no=p->>'enrollment'))
     or exists(select 1 from team_members where event_slug=ev.slug and enrollment_no=p->>'enrollment') then
    return jsonb_build_object('error','DUPLICATE','who',p->>'enrollment'); end if;
  for m in select value from jsonb_array_elements(coalesce(p->'members','[]')) loop
    if m->>'enrollment'=p->>'enrollment'
       or exists(select 1 from registrations where event_slug=ev.slug and enrollment_no=m->>'enrollment')
       or exists(select 1 from team_members where event_slug=ev.slug and enrollment_no=m->>'enrollment') then
      return jsonb_build_object('error','DUPLICATE','who',m->>'enrollment'); end if;
  end loop;
  code := 'TN26-'||lpad(nextval('reg_seq')::text,4,'0');
  insert into registrations(reg_id,name,email,enrollment_no,phone,department,year,event_slug,participation_type,team_name,team_size)
  values(code,p->>'name',lower(p->>'email'),p->>'enrollment',p->>'phone',p->>'department',p->>'year',ev.slug,p->>'type',p->>'team_name',n) returning id into rid;
  for m in select value from jsonb_array_elements(coalesce(p->'members','[]')) loop
    insert into team_members(registration_id,event_slug,name,enrollment_no,phone) values(rid,ev.slug,m->>'name',m->>'enrollment',m->>'phone');
  end loop;
  return jsonb_build_object('reg_id',code);
exception when unique_violation then return jsonb_build_object('error','DUPLICATE');  -- rolls back inserts
end $$;

create or replace function lookup_registration(q text) returns jsonb
language sql security definer set search_path=public as $$
select coalesce(jsonb_agg(jsonb_build_object('reg_id',r.reg_id,'name',r.name,'event',r.event_slug,'type',r.participation_type,'team_name',r.team_name,
 'enrollment',left(r.enrollment_no,3)||'*****','phone','******'||right(r.phone,4),'created_at',r.created_at,
 'members',(select coalesce(jsonb_agg(jsonb_build_object('name',t.name,'enrollment',left(t.enrollment_no,3)||'*****')),'[]'::jsonb) from team_members t where t.registration_id=r.id))),'[]'::jsonb)
from registrations r where lower(r.email)=lower(trim(q)) or r.reg_id=upper(trim(q)) $$;

create or replace function organiser_list(u text, pw text) returns jsonb
language plpgsql security definer set search_path=public,extensions as $$
begin
  if not exists(select 1 from organisers where username=u and password_hash=crypt(pw,password_hash)) then raise exception 'invalid'; end if;
  return coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('members',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from team_members t where t.registration_id=r.id)) order by r.created_at desc) from registrations r),'[]'::jsonb);
end $$;
