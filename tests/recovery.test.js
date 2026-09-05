import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as model from '../src/model.js';
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
function harness(getNest){
 const context={...model,e:model.escapeHTML,configured:false,client:{removeChannel:async()=>{},auth:{}},getNest,URL,URLSearchParams,location:{hash:'',pathname:'/'},history:{replaceState(){}},localStorage:{getItem:()=>null,setItem(){}},document:{querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){}},window:{addEventListener(){}},setTimeout,console};
 const code=source.replace(/^import .*;\n/gm,'').split("invite=readInvite(new URLSearchParams(location.hash.slice(1)).get('invite'));" )[0];
 vm.runInNewContext(code+`\nlet renders=0;render=()=>renders++;toast=()=>{};updateStatus=()=>{};globalThis.testApi={refresh,mutate,clearSession,setup(){user={id:'u'};demo=false;phase='ready';nest={...newDemo(),notes:[]};},state:()=>({user,demo,nest,renders,generation}),};`,context);
 return context.testApi;
}
test('late read cannot restore private room data after logout',async()=>{
 let resolve;const api=harness(()=>new Promise(r=>resolve=r));api.setup();const pending=api.refresh();api.clearSession();resolve({...model.newDemo(),notes:[{body:'private'}]});await pending;
 assert.equal(api.state().demo,true);assert.equal(api.state().user,null);assert.equal(api.state().nest.notes.length,0);
});
test('successful mutation is not treated as failed because a follow-up read fails',async()=>{
 let reads=0;const api=harness(async()=>{reads++;throw Error('network');});api.setup();await api.mutate(async room=>{room.notes.push({body:'saved'});},'saved');assert.equal(api.state().nest.notes.length,1);assert.equal(reads,0);
});
test('a failed mutation always releases the action lock for retry',async()=>{
 const api=harness(async()=>model.newDemo());api.setup();await api.mutate(async()=>{throw Error('network');},'fail');await api.mutate(async room=>room.notes.push({body:'retry'}),'ok');assert.equal(api.state().nest.notes.length,1);
});
test('in-flight mutation holds the old room object when a session ends',async()=>{
 let resolve;const api=harness(async()=>model.newDemo());api.setup();const pending=api.mutate(async room=>{await new Promise(r=>resolve=r);room.notes.push({body:'private'});},'ok');api.clearSession();resolve();await pending;assert.equal(api.state().nest.notes.length,0);
});
