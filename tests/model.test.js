import {test} from 'node:test';
import assert from 'node:assert/strict';
import {daysTogether,escapeHTML} from '../src/model.js';
test('anniversary uses local calendar days, inclusive',()=>{assert.equal(daysTogether('2026-09-04',new Date(2026,8,5,0,1)),2);assert.equal(daysTogether(null),0);assert.equal(daysTogether('2027-01-01',new Date(2026,8,5)),0);});
test('private messages render as text rather than executable HTML',()=>assert.equal(escapeHTML('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'));
