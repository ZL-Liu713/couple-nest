-- Run once in a new Supabase project's SQL Editor.
create table public.rooms (
 id uuid primary key default gen_random_uuid(),
 anniversary date check (anniversary <= current_date),
 created_at timestamptz not null default now()
);
create table public.members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 room_id uuid not null references public.rooms(id) on delete cascade,
 nickname text not null check (char_length(trim(nickname)) between 1 and 20),
 mood text check (mood in ('🥰 超想你','😎 元气满满','🥺 求抱抱','😴 困困的','🌧️ 有点低落'))
);
create index members_room_idx on public.members(room_id);
create table public.invites (
 token uuid primary key default gen_random_uuid(),
 room_id uuid unique not null references public.rooms(id) on delete cascade,
 expires_at timestamptz not null default now() + interval '24 hours'
);
create table public.notes (
 id uuid primary key default gen_random_uuid(), room_id uuid not null references public.rooms(id) on delete cascade,
 author uuid not null references auth.users(id), body text not null check(char_length(trim(body)) between 1 and 500),
 created_at timestamptz not null default now()
);
create table public.wishes (
 id uuid primary key default gen_random_uuid(), room_id uuid not null references public.rooms(id) on delete cascade,
 author uuid not null references auth.users(id), body text not null check(char_length(trim(body)) between 1 and 100),
 done boolean not null default false, created_at timestamptz not null default now()
);
create table public.pokes (
 id uuid primary key default gen_random_uuid(), room_id uuid not null references public.rooms(id) on delete cascade,
 author uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create index notes_room_idx on public.notes(room_id,created_at desc);
create index wishes_room_idx on public.wishes(room_id,created_at desc);
create index pokes_room_idx on public.pokes(room_id,created_at desc);
alter table public.rooms enable row level security;
alter table public.members enable row level security;
alter table public.invites enable row level security;
alter table public.notes enable row level security;
alter table public.wishes enable row level security;
alter table public.pokes enable row level security;
create function public.my_room() returns uuid language sql stable security definer set search_path = public
as $$ select room_id from public.members where user_id = auth.uid() $$;
create policy room_read on public.rooms for select to authenticated using(id = public.my_room());
create policy members_read on public.members for select to authenticated using(room_id = public.my_room());
create policy members_mood on public.members for update to authenticated using(user_id = auth.uid()) with check(user_id = auth.uid());
create policy notes_read on public.notes for select to authenticated using(room_id = public.my_room());
create policy notes_add on public.notes for insert to authenticated with check(room_id = public.my_room() and author = auth.uid());
create policy wishes_read on public.wishes for select to authenticated using(room_id = public.my_room());
create policy wishes_add on public.wishes for insert to authenticated with check(room_id = public.my_room() and author = auth.uid());
create policy wishes_check on public.wishes for update to authenticated using(room_id = public.my_room()) with check(room_id = public.my_room());
create policy pokes_read on public.pokes for select to authenticated using(room_id = public.my_room());
create policy pokes_add on public.pokes for insert to authenticated with check(room_id = public.my_room() and author = auth.uid());
-- All membership mutations go through functions; clients cannot promote themselves or change rooms.
revoke all on public.rooms,public.members,public.invites,public.notes,public.wishes,public.pokes from anon,authenticated;
grant select on public.rooms,public.members,public.notes,public.wishes,public.pokes to authenticated;
grant update(mood) on public.members to authenticated;
grant insert(room_id,author,body) on public.notes,public.wishes to authenticated;
grant insert(room_id,author) on public.pokes to authenticated;
grant update(done) on public.wishes to authenticated;
create function public.create_nest(p_nickname text) returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
 if auth.uid() is null then raise exception '请先登录'; end if;
 if exists(select 1 from public.members where user_id=auth.uid()) then raise exception '你已经有一个小窝啦'; end if;
 insert into public.rooms default values returning id into rid;
 insert into public.members(user_id,room_id,nickname) values(auth.uid(),rid,trim(p_nickname));
 return rid;
end $$;
create function public.new_invite() returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid; invitation uuid;
begin
 rid:=public.my_room();
 if rid is null then raise exception '请先创建小窝'; end if;
 perform 1 from public.rooms where id=rid for update;
 if (select count(*) from public.members where room_id=rid)>=2 then raise exception '小窝里已经有两个人啦'; end if;
 delete from public.invites where room_id=rid;
 insert into public.invites(room_id) values(rid) returning token into invitation;
 return invitation;
end $$;
create function public.join_nest(p_token text,p_nickname text) returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
 if auth.uid() is null then raise exception '请先登录'; end if;
 if exists(select 1 from public.members where user_id=auth.uid()) then raise exception '你已经有一个小窝啦'; end if;
 select room_id into rid from public.invites where token::text=p_token and expires_at>now();
 if rid is null then raise exception '邀请已失效，请让另一半重新生成'; end if;
 -- Serialize joins and invite rotation on the room, then recheck the invite.
 perform 1 from public.rooms where id=rid for update;
 if not exists(select 1 from public.invites where room_id=rid and token::text=p_token and expires_at>now()) then raise exception '邀请已失效，请让另一半重新生成'; end if;
 if (select count(*) from public.members where room_id=rid)>=2 then raise exception '这个小窝已经住满啦'; end if;
 insert into public.members(user_id,room_id,nickname) values(auth.uid(),rid,trim(p_nickname));
 delete from public.invites where room_id=rid;
 return rid;
end $$;
create function public.update_nest(p_nickname text,p_anniversary date) returns void language plpgsql security definer set search_path = public as $$
begin
 if public.my_room() is null then raise exception '请先加入小窝'; end if;
 update public.members set nickname=trim(p_nickname) where user_id=auth.uid();
 update public.rooms set anniversary=p_anniversary where id=public.my_room();
end $$;
revoke all on function public.my_room(),public.create_nest(text),public.new_invite(),public.join_nest(text,text),public.update_nest(text,date) from public,anon;
grant execute on function public.my_room(),public.create_nest(text),public.new_invite(),public.join_nest(text,text),public.update_nest(text,date) to authenticated;
alter publication supabase_realtime add table public.rooms,public.members,public.notes,public.wishes,public.pokes;
