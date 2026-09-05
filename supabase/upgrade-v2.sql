-- Existing installations: run this additive migration once; it is safe to run again.
-- Run schema.sql first if this is a new project. Existing notes and rooms are preserved.
begin;
alter table public.members add column if not exists gender text not null default 'private' check(gender in ('private','female','male','custom'));
alter table public.members add column if not exists avatar text not null default '🐰' check(avatar in ('🐰','🐻','🐱','🐶','🦊','🐼','🐧','🐨'));
create or replace function public.save_profile(p_nickname text,p_anniversary date,p_gender text,p_avatar text) returns void language plpgsql security definer set search_path=public as $$
begin
 if public.my_room() is null then raise exception '请先加入小窝'; end if;
 if not public.room_open(public.my_room()) then raise exception '小窝已归档，不能修改';end if;
 update public.members set nickname=trim(p_nickname),gender=p_gender,avatar=p_avatar where user_id=auth.uid();
 update public.rooms set anniversary=p_anniversary where id=public.my_room();
end $$;
revoke all on function public.save_profile(text,date,text,text) from public,anon;
grant execute on function public.save_profile(text,date,text,text) to authenticated;
create table if not exists public.photos (
 id uuid primary key default gen_random_uuid(),room_id uuid not null references public.rooms(id) on delete cascade,
 author uuid not null references auth.users(id),path text not null unique,
 caption text not null default '' check(char_length(caption)<=120),created_at timestamptz not null default now(),
 check(path like room_id::text || '/' || author::text || '/%')
);
create index if not exists photos_room_idx on public.photos(room_id,created_at desc);
alter table public.photos enable row level security;
revoke all on public.photos from anon,authenticated;
grant select on public.photos to authenticated;
grant insert(room_id,author,path,caption) on public.photos to authenticated;
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='photos' and policyname='photos_read') then
 create policy photos_read on public.photos for select to authenticated using(room_id=public.my_room());
 create policy photos_add on public.photos for insert to authenticated with check(room_id=public.my_room() and author=auth.uid());
 end if;
end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('nest-media','nest-media',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='nest_media_read') then
 create policy nest_media_read on storage.objects for select to authenticated using(bucket_id='nest-media' and (storage.foldername(name))[1]=public.my_room()::text);
 create policy nest_media_upload on storage.objects for insert to authenticated with check(bucket_id='nest-media' and (storage.foldername(name))[1]=public.my_room()::text and (storage.foldername(name))[2]=auth.uid()::text);
 create policy nest_media_cleanup on storage.objects for delete to authenticated using(bucket_id='nest-media' and (storage.foldername(name))[1]=public.my_room()::text and (storage.foldername(name))[2]=auth.uid()::text);
 end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='photos') then
 alter publication supabase_realtime add table public.photos;
 end if;
end $$;


alter table public.rooms add column if not exists closed_at timestamptz;
create or replace function public.room_open(p_room uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.rooms where id=p_room and closed_at is null)$$;
revoke all on function public.room_open(uuid) from public,anon;
grant execute on function public.room_open(uuid) to authenticated;
create or replace function public.leave_nest() returns void language plpgsql security definer set search_path=public as $$
declare rid uuid;
begin
 rid:=public.my_room();if rid is null then raise exception '当前账号没有加入小窝';end if;
 perform 1 from public.rooms where id=rid for update;
 update public.rooms set closed_at=coalesce(closed_at,now()) where id=rid;
 delete from public.invites where room_id=rid;
 delete from public.members where user_id=auth.uid();
end $$;
revoke all on function public.leave_nest() from public,anon;
grant execute on function public.leave_nest() to authenticated;
do $$ declare t text; begin
 foreach t in array array['notes','wishes','pokes','photos'] loop
 if not exists(select 1 from pg_policies where schemaname='public' and tablename=t and policyname='open_room_insert') then
 execute format('create policy open_room_insert on public.%I as restrictive for insert to authenticated with check(public.room_open(room_id))',t);
 end if;
 end loop;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='wishes' and policyname='open_room_update') then
 create policy open_room_update on public.wishes as restrictive for update to authenticated using(public.room_open(room_id)) with check(public.room_open(room_id));
 create policy open_member_update on public.members as restrictive for update to authenticated using(public.room_open(room_id)) with check(public.room_open(room_id));
 create policy open_media_insert on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'nest-media' or public.room_open(public.my_room()));
 end if;
end $$;
create or replace function public.new_invite() returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid; invitation uuid;
begin
 rid:=public.my_room();
 if rid is null then raise exception '请先创建小窝'; end if;
 perform 1 from public.rooms where id=rid for update;
 if not public.room_open(rid) then raise exception '这个小窝已经归档，不能再邀请或加入';end if;
 if (select count(*) from public.members where room_id=rid)>=2 then raise exception '小窝里已经有两个人啦'; end if;
 delete from public.invites where room_id=rid;
 insert into public.invites(room_id) values(rid) returning token into invitation;
 return invitation;
end $$;
create or replace function public.join_nest(p_token text,p_nickname text) returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
 if auth.uid() is null then raise exception '请先登录'; end if;
 if exists(select 1 from public.members where user_id=auth.uid()) then raise exception '你已经有一个小窝啦'; end if;
 select room_id into rid from public.invites where token::text=p_token and expires_at>now();
 if rid is null then raise exception '邀请已失效，请让另一半重新生成'; end if;
 -- Serialize joins and invite rotation on the room, then recheck the invite.
 perform 1 from public.rooms where id=rid for update;
 if not public.room_open(rid) then raise exception '这个小窝已经归档，不能再邀请或加入';end if;
 if not exists(select 1 from public.invites where room_id=rid and token::text=p_token and expires_at>now()) then raise exception '邀请已失效，请让另一半重新生成'; end if;
 if (select count(*) from public.members where room_id=rid)>=2 then raise exception '这个小窝已经住满啦'; end if;
 insert into public.members(user_id,room_id,nickname) values(auth.uid(),rid,trim(p_nickname));
 delete from public.invites where room_id=rid;
 return rid;
end $$;

create or replace function public.update_nest(p_nickname text,p_anniversary date) returns void language plpgsql security definer set search_path = public as $$
begin
 if public.my_room() is null then raise exception '请先加入小窝'; end if;
 if not public.room_open(public.my_room()) then raise exception '小窝已归档，不能修改';end if;
 update public.members set nickname=trim(p_nickname) where user_id=auth.uid();
 update public.rooms set anniversary=p_anniversary where id=public.my_room();
end $$;

notify pgrst,'reload schema';
commit;
