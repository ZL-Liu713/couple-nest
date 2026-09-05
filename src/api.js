import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configured = Boolean(url && key);
export const client = configured ? createClient(url,key) : null;
export async function result(query) { const {data,error} = await query; if(error) throw error; return data; }
export async function getNest(userId) {
 const membership = await result(client.from('members').select('room_id').eq('user_id',userId).maybeSingle());
 if(!membership) return null;
 const id=membership.room_id;
 const [room,members,notes,wishes,pokes] = await Promise.all([
 result(client.from('rooms').select('id,anniversary').eq('id',id).single()),
 result(client.from('members').select('*').eq('room_id',id)),
 result(client.from('notes').select('*').eq('room_id',id).order('created_at',{ascending:false}).limit(100)),
 result(client.from('wishes').select('*').eq('room_id',id).order('created_at',{ascending:false}).limit(100)),
 result(client.from('pokes').select('*').eq('room_id',id).order('created_at',{ascending:false}).limit(100))]);
 return {room,members,notes,wishes,pokes};
}
