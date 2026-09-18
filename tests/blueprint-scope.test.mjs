import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { BLUEPRINT_SCOPE_SHA256, validateBlueprintScope, scopeAllowsQuestion, studyScopeLabel, reconcileScopeDraft } from '../expanded/blueprint-scope.mjs';
import { createCurrentFilter, effectiveQuestions, questionFitsFilter, cancelReplacement, reconcileWeekDraft } from '../expanded/week-mapping.mjs';
import { blankState, beginSession, selectOption, setConfidence, submitAnswer, nextQuestion, validateState, activeProvenance, historyContext, assertImmutableLedger, score } from '../expanded/engine.mjs';
import { learningPracticeSettings, summarizeLearning } from '../expanded/learning.mjs';
import { blankHard80State, beginHard80Exam, validateHard80State } from '../expanded/hard80.mjs';
const bank = JSON.parse(fs.readFileSync(new URL('../expanded/bank.json',import.meta.url)));
const base = { week:'All', topic:'All', focus:'', limit:10 };
const q = id => bank.questions.find(q => q.id === id);
const filter = (values={}) => createCurrentFilter({...base,...values},bank);
const pool = values => effectiveQuestions(bank,filter(values));
function answerCurrent(s,correct=true) {
 const item=q(s.session.current.id),chosen=correct?item.options.filter(o=>o.correct):[item.options.find(o=>!o.correct)];
 for(const option of chosen)s=selectOption(s,option.id,bank);
 return submitAnswer(setConfidence(s,'sure'),bank);
}
function rng(seed=1){let n=seed;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}

test('scope mapping is pinned and every GYN question classified exactly once',()=>{
 const bytes=fs.readFileSync(new URL('../expanded/blueprint-scope.json',import.meta.url));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),BLUEPRINT_SCOPE_SHA256);
 const m=validateBlueprintScope(bank);assert.equal(Object.values(m.gynGroups).flat().length,52);assert.equal(Object.values(m.gynOutside).flat().length,31);
 assert.throws(()=>validateBlueprintScope({...bank,version:'foreign'}));
});
test('full coverage keeps445; restricted coverage has414 and seven content areas',()=>{
 assert.equal(pool().length,445);assert.equal(pool({scope:'full'}).length,445);assert.equal(pool({scope:'blueprint'}).length,414);
 const counts=Object.fromEntries(Object.keys(bank.topics).map(topic=>[topic,pool({scope:'blueprint',topic}).length]));
 assert.deepEqual(counts,{Pregnancy:79,Labor:68,Newborn:77,GYN:52,Growth:62,Skin:37,GI:39});
});
test('decision-specific mixed cases qualify but incidental words do not',()=>{
 for(const id of ['h80-q008','h80-q012','cov1-gyn-017','sf1-q279','sf1-q085','cov1-gyn-011','cov1-gyn-015'])assert(scopeAllowsQuestion(q(id),'blueprint',bank),id);
 for(const id of ['h80-q026','h80-q001','sf1-q218','sf1-q217','sf1-q212','sf1-q213','sf1-q253','cov1-gyn-010'])assert(!scopeAllowsQuestion(q(id),'blueprint',bank),id);
});
test('scope intersects week and topic pools without crossing their boundaries',()=>{
 for(const [week,count] of [[4,79],[5,145],[6,114],[7,76]])assert.equal(pool({scope:'blueprint',week}).length,count);
 assert.equal(pool({scope:'blueprint',week:6,topic:'GYN'}).length,52);
 assert.throws(()=>filter({scope:'blueprint',week:4,topic:'GYN'}));
});
test('full and pre-filter session provenance keeps its exact original shape',()=>{
 const a=filter(),b=filter({scope:'full'});assert.deepEqual(a,b);assert(!Object.hasOwn(a,'scope'));
 const s=beginSession(blankState(bank),base,bank,rng());const raw=JSON.stringify(s);
 assert.equal(JSON.stringify(validateState(JSON.parse(raw),bank)),raw);assert.equal(studyScopeLabel(a),'Full course coverage');
});
test('scope draft clears incompatible focus but does not mutate settings or current state',()=>{
 const settings={...base,week:6,topic:'GYN',focus:'gyn/mht'},s=beginSession(blankState(bank),settings,bank,rng()),before=JSON.stringify(s);
 const result=reconcileScopeDraft(settings,'blueprint',bank);assert.equal(result.settings.focus,'');assert.match(result.visibleStatus,/cleared/);assert.equal(settings.focus,'gyn/mht');
 assert.equal(JSON.stringify(s),before);assert.equal(cancelReplacement(s).nextState,s);assert(!cancelReplacement(s).shouldWriteStorage);
 assert.equal(reconcileScopeDraft({...settings,focus:'gyn/ec'},'blueprint',bank).settings.focus,'gyn/ec');
 assert.equal(reconcileWeekDraft(result.settings,7,bank).settings.scope,'blueprint');
});
test('engine rejects a direct incompatible focus or unknown scope, not just UI choices',()=>{
 assert.throws(()=>beginSession(blankState(bank),{...base,topic:'GYN',scope:'blueprint',focus:'gyn/mht'},bank),/scope/);
 assert.throws(()=>filter({scope:'made-up'}));
});
test('every selection and spacing path stays within the scope across seeds and areas',()=>{
 for(let seed=1;seed<=8;seed++){
  let s=beginSession(blankState(bank),{...base,week:6,topic:'GYN',scope:'blueprint',focus:seed%2?'gyn/ec':''},bank,rng(seed));
  while(!s.session.done){assert(scopeAllowsQuestion(q(s.session.current.id),'blueprint',bank));s=answerCurrent(s,seed%2===0);s=nextQuestion(s,bank,rng(seed+100));}
  assert(s.history.length>0);assert.deepEqual(validateState(s,bank),s);
 }
 for(const topic of Object.keys(bank.topics)){const s=beginSession(blankState(bank),{...base,topic,scope:'blueprint'},bank,rng(7));assert(questionFitsFilter(q(s.session.current.id),activeProvenance(s).filter,bank));}
});
test('restricted sessions exhaust without substituting excluded cases',()=>{
 let s=blankState(bank);const ids=new Set();
 for(let i=0;i<6;i++){
  s=beginSession(s,{...base,week:6,topic:'GYN',scope:'blueprint',limit:40},bank,rng(i+31));
  while(!s.session.done){ids.add(s.session.current.id);s=answerCurrent(s);s=nextQuestion(s,bank,rng(i+100));}
  assert(s.history.filter(a=>a.sessionId===s.session.id).length<=40);
 }
 assert([...ids].every(id=>scopeAllowsQuestion(q(id),'blueprint',bank)));
});
test('restricted selection and shuffled option identity survive reload before and after submission',()=>{
 let s=beginSession(blankState(bank),{...base,scope:'blueprint'},bank,rng(42));
 s=selectOption(s,s.session.current.order[0],bank);s=setConfidence(s,'unsure');
 assert.deepEqual(validateState(JSON.parse(JSON.stringify(s)),bank),s);
 s=submitAnswer(s,bank);assert.deepEqual(validateState(JSON.parse(JSON.stringify(s)),bank),s);
 assert.equal(studyScopeLabel(activeProvenance(s).filter),'Blueprint-only topics');
});
test('new scope sessions preserve older broader answers and their immutable provenance',()=>{
 let old=beginSession(blankState(bank),{...base,week:6,topic:'GYN',focus:'gyn/mht'},bank,rng(2));old=answerCurrent(old);
 assert(!scopeAllowsQuestion(q(old.history[0].id),'blueprint',bank));
 let next=beginSession(old,{...base,scope:'blueprint'},bank,rng(3));assertImmutableLedger(old,next);assert.deepEqual(next.history,old.history);
 next=answerCurrent(next);assert.deepEqual(validateState(next,bank),next);assert.equal(studyScopeLabel(historyContext(next,0,bank).provenance.filter),'Full course coverage');
 assert.equal(studyScopeLabel(historyContext(next,1,bank).provenance.filter),'Blueprint-only topics');
 assert.equal(summarizeLearning(next,bank).attempts,2);
});
test('tampered, partial and unknown scope mappings fail closed',()=>{
 const good=beginSession(blankState(bank),{...base,scope:'blueprint'},bank,rng());
 for(const edit of [f=>delete f.scopeMapVersion,f=>f.scopeMapSha256='0'.repeat(64),f=>f.scope='full',f=>f.scope='other',f=>f.scopeMapVersion='future',f=>f.focus='gyn/mht']){
  const s=structuredClone(good);edit(s.sessions[s.session.id].filter);assert.throws(()=>validateState(s,bank));
 }
});
test('restricted backups cannot smuggle an out-of-scope current or historic question',()=>{
 let s=beginSession(blankState(bank),{...base,week:6,topic:'GYN',focus:'gyn/mht'},bank,rng(2));
 const restricted=filter({week:6,topic:'GYN',scope:'blueprint'});
 const current=structuredClone(s);current.sessions[current.session.id].filter=restricted;assert.throws(()=>validateState(current,bank));
 s=answerCurrent(s);s.sessions[s.session.id].filter=restricted;assert.throws(()=>validateState(s,bank));
});
test('scope labels never affect exact scoring or stored correct answers',()=>{
 const question=q('sf1-q070'),selected=question.options.filter(o=>o.correct).map(o=>o.id),before=JSON.stringify(bank);
 assert(score(question,selected).exact);pool({scope:'blueprint'});assert.equal(JSON.stringify(bank),before);assert(score(question,selected).exact);
});
test('My Learning practice preserves eligible scope and explicitly falls back for broader focuses',()=>{
 assert.equal(learningPracticeSettings(bank,'gyn/ec','blueprint').scope,'blueprint');
 assert.equal(learningPracticeSettings(bank,'gyn/mht','blueprint').scope,'full');
 assert.equal(learningPracticeSettings(bank,'gyn/mht').scope,'full');
});
test('Hard80 remains the same80 with its exact original quotas and saved identities',()=>{
 const a=beginHard80Exam(blankHard80State(bank),bank,rng(5));pool({scope:'blueprint'});
 assert.deepEqual(validateHard80State(a,bank),a);
 const counts={};for(const r of a.attempt.records){const t=q(r.id).topic;counts[t]=(counts[t]??0)+1;}
 assert.equal(a.attempt.records.length,80);assert.deepEqual(counts,{Pregnancy:15,Labor:15,Newborn:15,GYN:15,Growth:10,Skin:5,GI:5});
});
