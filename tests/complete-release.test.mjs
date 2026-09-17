import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {blankState,validateState} from '../study/engine.mjs';
import {blankHard80State,beginHard80Exam,validateHard80State} from '../study/hard80.mjs';
const bank=JSON.parse(fs.readFileSync(new URL('../study/bank.json',import.meta.url))),release=JSON.parse(fs.readFileSync(new URL('../study/release.json',import.meta.url)));
test('reviewed bank identity and exact hard80 blueprint remain fixed',()=>{
 assert.equal(bank.questions.length,349);assert.equal(bank.version,'exam2-complete-1.1.1');assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../study/bank.json',import.meta.url))).digest('hex'),release.bankSha256);
 const counts={};for(const q of bank.questions.filter(q=>q.hard80Eligible===true))counts[q.topic]=(counts[q.topic]||0)+1;
 assert.deepEqual(counts,{Pregnancy:15,Labor:15,Newborn:15,GYN:15,Growth:10,Skin:5,GI:5});
});
test('current save namespaces validate and foreign versions fail without mutation using accurate notices',()=>{
 for(const [blank,validate] of [[blankState,validateState],[blankHard80State,validateHard80State]]){
  const current=blank(bank);assert.deepEqual(validate(current,bank),current);const old={...current,bankVersion:'exam2-complete-1.1.0'},bytes=JSON.stringify(old);assert.throws(()=>validate(old,bank),/Exam 2 Complete 1\.1\.1/);assert.equal(JSON.stringify(old),bytes);
 }
});
test('hard80 creates and restores exactly80 unique saved identities',()=>{const state=beginHard80Exam(blankHard80State(bank),bank,()=>0.43);assert.equal(state.attempt.records.length,80);assert.equal(new Set(state.attempt.records.map(q=>q.id)).size,80);assert.deepEqual(validateHard80State(JSON.parse(JSON.stringify(state)),bank),state);});
test('all public source labels exclude internal extraction locators',()=>{for(const q of bank.questions)for(const ref of q.refs)assert(!/verified supplied-text locator|\blines?\s+\d+[–-]\d+|\b[PT]\d+[–-][PT]?\d+|\/Users\//u.test(ref.label),q.id);});
