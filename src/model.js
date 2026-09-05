export const moods = ['🥰 超想你', '😎 元气满满', '🥺 求抱抱', '😴 困困的', '🌧️ 有点低落'];
export const ideas = ['一起散步，找到今天最好看的天空', '各选一首歌，交换今天的单曲循环', '视频连线，一起吃一顿晚饭', '一起看一部一直想看的电影', '给对方拍一张「此刻的我」', '各写三个愿望，看看有没有同一个', '一起做十分钟拉伸', '约好下一次见面的第一顿饭'];
export function daysTogether(date, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return 0;
  const [y,m,d] = date.split('-').map(Number);
  return Math.max(0, Math.floor((Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()) - Date.UTC(y,m-1,d))/86400000)+1);
}
export function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function newDemo() { return { room: {id:'demo',anniversary:null}, members:[{user_id:'me',nickname:'我',mood:null},{user_id:'partner',nickname:'另一半',mood:null}], notes:[], wishes:[], pokes:[] }; }
export function localDate(now=new Date()) { return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`; }
export function readInvite(value) {
 const text=String(value||'').trim();
 let token=text;
 if(text.includes('://')) { try {token=new URLSearchParams(new URL(text).hash.slice(1)).get('invite')||'';} catch{return '';} }
 return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)?token.toLowerCase():'';
}
export function explainError(error) {
 const code=error?.code||'',message=String(error?.message||error||'');
 if(code==='PGRST205'||code==='PGRST202'||/schema cache|does not exist/.test(message)) return '小窝数据库尚未初始化完整。请网站主人运行 supabase/schema.sql；已建好表时刷新数据库缓存，再点击重试。';
 if(code==='email_not_confirmed'||/Email not confirmed/i.test(message))return '邮箱尚未确认。请查看最新确认邮件，或重新发送确认邮件。';
 if(code==='invalid_credentials'||/Invalid login credentials/i.test(message))return '邮箱或密码不正确，请检查后重试。';
 if(code==='otp_expired')return '确认链接已失效或已使用。先尝试登录；若尚未确认邮箱，请重新发送邮件。';
 if(error?.status===429||/rate limit|after \d+ seconds/i.test(message))return '操作太频繁，请至少等待 60 秒后再试。';
 if(/Failed to fetch|NetworkError|network|Load failed/i.test(message))return '网络连接失败，请检查网络后重试。未发送的内容会保留。';
 if(code==='42501')return '当前账号没有操作权限，请检查小窝成员关系或数据库权限配置。';
 return message||'操作没有完成，请稍后重试。';
}
export const avatars=['🐰','🐻','🐱','🐶','🦊','🐼','🐧','🐨'];
export const genders={private:'不展示',female:'女',male:'男',custom:'其他'};
export function validatePhoto(file){if(!file)throw Error('请先选择一张照片');if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('请选择 JPG、PNG 或 WebP 照片');if(file.size>5*1024*1024)throw Error('单张照片不能超过 5 MB');if(file.size===0)throw Error('这张照片为空，请重新选择');}
