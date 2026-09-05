import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('v2 is repeatable, preserves records, restricts photos and archives a departed room',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to authenticated;create publication supabase_realtime;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;
 insert into auth.users values('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000003');`);
 await db.exec(await readFile(new URL('../supabase/schema.sql',import.meta.url),'utf8'));
 const upgrade=await readFile(new URL('../supabase/upgrade-v2.sql',import.meta.url),'utf8');await db.exec(upgrade);await db.exec(upgrade);
 async function user(n,sql){await db.exec(`reset role;set request.jwt.claim.sub='00000000-0000-0000-0000-${String(n).padStart(12,'0')}';set role authenticated;`);return db.query(sql);}
 const room=(await user(1,"select create_nest('兔') id")).rows[0].id;const invite=(await user(1,'select new_invite() token')).rows[0].token;await user(2,`select join_nest('${invite}','熊')`);
 await user(1,"select save_profile('兔','2026-09-01','private','🦊')");assert.equal((await user(2,"select avatar from members where nickname='兔'")).rows[0].avatar,'🦊');
 const path=`${room}/00000000-0000-0000-0000-000000000001/photo.jpg`;
 await user(1,`insert into storage.objects(bucket_id,name) values('nest-media','${path}')`);await user(1,`insert into photos(room_id,author,path,caption) values('${room}',auth.uid(),'${path}','回忆')`);
 assert.equal((await user(2,'select * from photos')).rows.length,1);assert.equal((await user(3,'select * from photos')).rows.length,0);assert.equal((await user(3,'select * from storage.objects')).rows.length,0);
 await assert.rejects(user(2,`insert into storage.objects(bucket_id,name) values('nest-media','${path}')`));
 await user(1,'select leave_nest()');assert.equal((await user(1,'select * from photos')).rows.length,0);assert.equal((await user(2,'select * from photos')).rows.length,1);
 await assert.rejects(user(2,'select new_invite()'));await assert.rejects(user(2,`insert into notes(room_id,author,body) values('${room}',auth.uid(),'归档后不可写')`));await assert.rejects(user(2,"select save_profile('改名',null,'male','🐻')"));
 const newRoom=(await user(1,"select create_nest('新窝') id")).rows[0].id;assert.notEqual(newRoom,room);assert.equal((await user(1,'select * from photos')).rows.length,0);
 }finally{await db.close();}
});
