import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('two-person pairing, private data, forgery prevention and single-use invitations',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$; grant usage on schema auth,public to authenticated; grant execute on function auth.uid() to authenticated; create publication supabase_realtime; insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000003');`);
 await db.exec(await readFile(new URL('../supabase/schema.sql',import.meta.url),'utf8'));
 async function asUser(n,sql){await db.exec(`reset role; set request.jwt.claim.sub='00000000-0000-0000-0000-${String(n).padStart(12,'0')}'; set role authenticated;`);return db.query(sql);}
 const room=(await asUser(1,"select create_nest('小兔') as id")).rows[0].id;
 const token=(await asUser(1,'select new_invite() as token')).rows[0].token;
 await asUser(1,`insert into notes(room_id,author,body) values('${room}',auth.uid(),'只给你看')`);
 assert.equal((await asUser(3,'select * from notes')).rows.length,0);
 await assert.rejects(asUser(3,`insert into notes(room_id,author,body) values('${room}',auth.uid(),'闯入')`));
 await assert.rejects(asUser(3,`insert into members values(auth.uid(),'${room}','入侵者',null)`));
 await assert.rejects(asUser(3,`select join_nest('wrong','陌生人')`));
 await asUser(2,`select join_nest('${token}','小熊')`);
 assert.equal((await asUser(2,'select * from notes')).rows.length,1);
 await assert.rejects(asUser(3,`select join_nest('${token}','第三人')`));
 await assert.rejects(asUser(1,'select new_invite()'));
 await assert.rejects(asUser(2,`insert into notes(room_id,author,body) values('${room}','00000000-0000-0000-0000-000000000001','冒充')`));
 await assert.rejects(asUser(2,`update members set room_id=gen_random_uuid() where user_id=auth.uid()`));
 await asUser(1,`insert into wishes(room_id,author,body) values('${room}',auth.uid(),'一起旅行')`);
 await asUser(2,'update wishes set done=true');
 assert.equal((await asUser(1,'select done from wishes')).rows[0].done,true);
 await asUser(2,"select update_nest('熊熊','2026-01-01')");
 assert.equal((await asUser(1,'select anniversary::text from rooms')).rows[0].anniversary,'2026-01-01');
 await assert.rejects(asUser(2,"select update_nest('熊熊','2099-01-01')"));
 assert.equal((await asUser(3,'select * from members')).rows.length,0);
 }finally{await db.close();}
});
