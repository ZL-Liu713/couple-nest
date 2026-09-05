export const moods = ['🥰 超想你', '😎 元气满满', '🥺 求抱抱', '😴 困困的', '🌧️ 有点低落'];
export const ideas = ['一起散步，找到今天最好看的天空', '各选一首歌，交换今天的单曲循环', '视频连线，一起吃一顿晚饭', '一起看一部一直想看的电影', '给对方拍一张「此刻的我」', '各写三个愿望，看看有没有同一个', '一起做十分钟拉伸', '约好下一次见面的第一顿饭'];
export function daysTogether(date, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return 0;
  const [y,m,d] = date.split('-').map(Number);
  return Math.max(0, Math.floor((Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()) - Date.UTC(y,m-1,d))/86400000)+1);
}
export function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function newDemo() { return { room: {id:'demo',anniversary:null}, members:[{user_id:'me',nickname:'我',mood:null},{user_id:'partner',nickname:'另一半',mood:null}], notes:[], wishes:[], pokes:[] }; }
