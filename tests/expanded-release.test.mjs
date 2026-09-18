import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {SAVE_KEY,blankState,validateState} from '../expanded/engine.mjs';
import {HARD80_SAVE_KEY,blankHard80State,beginHard80Exam,validateHard80State} from '../expanded/hard80.mjs';
import {validateCurrentWeekMapping,createCurrentFilter,effectiveQuestions} from '../expanded/week-mapping.mjs';
import {blankState as mainStudy} from '../study/engine.mjs';
import {blankHard80State as mainExam} from '../study/hard80.mjs';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url));
const bank=JSON.parse(read('expanded/bank.json')),main=JSON.parse(read('study/bank.json'));
test('expanded bank is the exact accepted445 and preserves every main349 question',()=>{
 assert.equal(crypto.createHash('sha256').update(read('expanded/bank.json')).digest('hex'),'b8da63284f9bc8af08ac3b3520d995cc346926285af6fbb2f1c9ea634414e046');
 assert.equal(bank.questions.length,445);assert.equal(new Set(bank.questions.map(q=>q.id)).size,445);
 assert.deepEqual(bank.questions.slice(0,349),main.questions);
 assert.deepEqual(bank.questions.filter(q=>q.hard80Eligible===true),main.questions.filter(q=>q.hard80Eligible===true));
});
test('expanded saves remain isolated and main backups are rejected without mutation',()=>{
 assert.equal(SAVE_KEY,'nur2460-exam2-coverage-private-3-study');assert.equal(HARD80_SAVE_KEY,'nur2460-exam2-coverage-private-3-hard80');
 for(const [blank,validate,foreign] of [[blankState,validateState,mainStudy(main)],[blankHard80State,validateHard80State,mainExam(main)]]){
  const own=blank(bank);assert.deepEqual(validate(own,bank),own);
  const bytes=JSON.stringify(foreign);assert.throws(()=>validate(foreign,bank),/Expanded 445/);assert.equal(JSON.stringify(foreign),bytes);
 }
});
test('the expanded Hard80 keeps exact quotas and saved shuffled identities',()=>{
 const exam=beginHard80Exam(blankHard80State(bank),bank,()=>0.43),ids=exam.attempt.records.map(q=>q.id);
 assert.equal(ids.length,80);assert.equal(new Set(ids).size,80);
 const counts={};for(const id of ids){const topic=bank.questions.find(q=>q.id===id).topic;counts[topic]=(counts[topic]||0)+1;}
 assert.deepEqual(counts,{Pregnancy:15,Labor:15,Newborn:15,GYN:15,Growth:10,Skin:5,GI:5});
 assert.deepEqual(validateHard80State(JSON.parse(JSON.stringify(exam)),bank),exam);
});
test('expanded week mapping retains the verified 445-question counts',()=>{
 validateCurrentWeekMapping(bank);
 for(const [week,count] of Object.entries({All:445,4:79,5:145,6:145,7:76}))assert.equal(effectiveQuestions(bank,createCurrentFilter({week:week==='All'?'All':Number(week),topic:'All',limit:10},bank)).length,count,week);
});
test('public labels and source references exclude private review language and locators',()=>{
 const app=read('expanded/app.mjs').toString();assert(app.includes('Exam 2 · Expanded'));assert(app.includes('Find older saved progress'));assert(!app.includes('Other versions'));
 assert(!/Isolated preview|No publication approval|pending independent combined QA|Coverage Private 3/.test(app));
 for(const q of bank.questions)for(const ref of q.refs)assert(!/verified supplied-text locator|\blines?\s+\d+[–-]\d+|\b[PT]\d+[–-][PT]?\d+|\/Users\//u.test(ref.label),q.id);
});
