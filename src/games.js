export const questions=[
 ['初见心动','第一次见到我时，你偷偷想了什么？'],['小小偏爱','我做过哪件不起眼的小事，让你觉得被爱着？'],['未来信箱','一年后的今天，你希望我们在做什么？'],['约会想象','如果明天可以一起去任何地方，你会选哪里？'],['默契挑战','猜猜我现在最想吃的一道菜，再告诉我你的答案。'],['夸夸时间','用三个词形容我，至少一个不能是「可爱」。'],['音乐情书','选一首最像我们的歌，把歌名告诉我。'],['日常温柔','最近有什么让你有点累的事，我能怎么陪你？'],['回忆放映','我们一起笑得最开心的一次，是哪一次？'],['喜欢清单','下次见面，你最想和我一起完成哪件小事？'],['交换愿望','说一个你还没告诉过我的小愿望。'],['晚安仪式','如果今天只能对我说一句话，你会说什么？']
];
export function shuffle(items,random=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function newMemory(){return {cards:shuffle(['🍓','🌷','🐰','🍒','💌','🧸','🌙','🍰'].flatMap(x=>[x,x])),open:[],matched:[],moves:0,started:Date.now()};}
export function openCard(game,index){if(!Number.isInteger(index)||index<0||index>=16||game.open.length>=2||game.matched.includes(index)||game.open.includes(index))return false;game.open.push(index);if(game.open.length===2){game.moves++;const [a,b]=game.open;if(game.cards[a]===game.cards[b]){game.matched.push(a,b);game.open=[];}}return true;}
export function winner(board){for(const [a,b,c]of [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]])if(board[a]&&board[a]===board[b]&&board[b]===board[c])return board[a];return board.every(Boolean)?'draw':null;}
export function ticMove(game,index){if(winner(game.board)||!Number.isInteger(index)||index<0||index>=9||game.board[index])return false;game.board[index]=game.turn;game.turn=game.turn==='♥'?'★':'♥';return true;}
