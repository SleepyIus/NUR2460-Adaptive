import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {SAVE_KEY,SAVE_SCHEMA,shuffle,score,blankState,beginSession,selectOption,setConfidence,submitAnswer,nextQuestion,validateState,findQuestion,trackEstimate,summarize} from '../checkpoint/engine.mjs';
const bank=JSON.parse(fs.readFileSync(new URL('../checkpoint/bank.json',import.meta.url)));
const seed=(n)=>()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
const start=(rng=seed(1),settings={topic:'All',focus:'',limit:20})=>beginSession(blankState(bank),settings,bank,rng);
function answer(s,correct=true,confidence='sure') {
  const q=findQuestion(bank,s.session.current);
  const selections=correct?q.options.filter(o=>o.correct):[q.options.find(o=>!o.correct)];
  for(const o of selections)s=selectOption(s,o.id,bank);
  s=setConfidence(s,confidence);return submitAnswer(s,bank);
}
test('frozen public inventory, stable identity, keyed format, field completeness and no private metadata',()=>{
  assert.equal(bank.questions.length,261);
  const ids=new Set(),topics={},formats={},levels={};
  for(const q of bank.questions){
    assert(!ids.has(q.id));ids.add(q.id);assert(q.id.startsWith('cp1-'));
    assert.equal(typeof q.revision,'string');assert(q.revision.length>=16);
    const {revision,...withoutRevision}=q;assert.equal(revision,crypto.createHash('sha256').update(JSON.stringify(withoutRevision)).digest('hex'));
    for(const k of ['stem','clue','rationale','difficultyReason','objective','track','evidenceFamily'])assert.equal(typeof q[k],'string',q.id+':'+k);
    assert(q.options.length>=4&&q.options.length<=6);assert.equal(new Set(q.options.map(o=>o.id)).size,q.options.length);
    for(const o of q.options){assert(o.text&&o.reason);assert.equal(typeof o.correct,'boolean');assert(!/\b(?:all|none) of the above\b|\bboth [A-F] and [A-F]\b/i.test(o.text));}
    const keys=q.options.filter(o=>o.correct);assert(q.kind==='MC'?keys.length===1:keys.length>=2&&keys.length<q.options.length,q.id);
    assert(q.refs.length);q.refs.forEach(r=>{assert(r.label);if(r.url)assert.equal(new URL(r.url).protocol,'https:');});
    assert(Array.isArray(q.relatedIds));assert(bank.tracks[q.track]);
    assert(!('candidateFile' in q)&&!('origin' in q)&&!('limits' in q));
    topics[q.topic]=(topics[q.topic]||0)+1;formats[q.kind]=(formats[q.kind]||0)+1;levels[q.difficulty]=(levels[q.difficulty]||0)+1;
  }
  assert.deepEqual(topics,{Pregnancy:48,Labor:48,Newborn:51,GYN:48,Growth:32,Skin:17,GI:17});
  assert.deepEqual(formats,{MC:206,SATA:55});assert.deepEqual(levels,{1:75,2:172,3:14});
  for(const q of bank.questions)for(const id of q.relatedIds)assert(ids.has(id));
  assert(!/\/Users\/|\.study-build\/|reviews\/(?:parallel|release)|file:\/\//.test(JSON.stringify(bank)));
});
test('save namespace is separate from both original quiz versions',()=>{
  assert(!['nur2460-exam2-v3','nur2460-exam2-expanded-v2'].includes(SAVE_KEY));
  assert.equal(blankState(bank).schema,SAVE_SCHEMA);
  assert.throws(()=>validateState({schema:3,bankVersion:'exam2-3.0.0',history:[]},bank));
});
test('Fisher-Yates preserves IDs; MC key positions vary without forced balancing',()=>{
  const rng=seed(3849),counts=[0,0,0,0],a=['a','b','c','d'];
  for(let n=0;n<20000;n++){const out=shuffle(a,rng);assert.deepEqual([...out].sort(),a);counts[out.indexOf('a')]++;}
  assert.deepEqual(a,['a','b','c','d']);counts.forEach(n=>assert(n>4600&&n<5400,JSON.stringify(counts)));
});
test('MC and SATA keys/rationales remain bound to option IDs in every permutation',()=>{
  const rng=seed(719);
  for(const q of bank.questions){const keys=q.options.filter(o=>o.correct).map(o=>o.id);assert(score(q,keys).exact);
    for(let n=0;n<10;n++){const order=shuffle(q.options.map(o=>o.id),rng);assert.deepEqual(new Set(order.filter(id=>q.options.find(o=>o.id===id).correct)),new Set(keys));}
    assert(!score(q,[]).exact);assert(!score(q,q.options.filter(o=>!o.correct).map(o=>o.id)).exact);
    if(q.kind==='SATA'){assert(!score(q,keys.slice(1)).exact);assert(!score(q,[...keys,q.options.find(o=>!o.correct).id]).exact);}
  }
});
test('unanswered and submitted resume round-trip with display order and selection; submitted answers lock',()=>{
  let s=start();const q=findQuestion(bank,s.session.current);
  s=selectOption(s,q.options[0].id,bank);s=setConfidence(s,'unsure');
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(s)),bank),s);
  const before=structuredClone(s);s=submitAnswer(s,bank);
  assert.equal(before.history.length,0);assert.deepEqual(s.session.current.order,before.session.current.order);
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(s)),bank),s);
  assert.throws(()=>submitAnswer(s,bank));assert.throws(()=>selectOption(s,q.options[1].id,bank));assert.throws(()=>setConfidence(s,'sure'));
  assert.deepEqual(s.session.current.selected,s.history.at(-1).selected);
});
test('requires both a selection and confidence, with safe transition order',()=>{
  let s=start();assert.throws(()=>nextQuestion(s,bank));assert.throws(()=>submitAnswer(s,bank));
  s=setConfidence(s,'guess');assert.throws(()=>submitAnswer(s,bank));
  assert.throws(()=>selectOption(s,'not-an-option',bank));
});
test('malformed, unknown-version, tampered, foreign and unsupported backups fail without mutating a current save',()=>{
  const saved=answer(start()),before=JSON.stringify(saved);
  const mutations=[s=>s.schema=3,s=>s.bankVersion='future',s=>s.revision=-1,s=>s.history[0].revision='missing',s=>s.history[0].selected.push('bogus'),s=>s.history[0].order.pop(),s=>s.history[0].confidence='false',s=>s.session.start=-1,s=>s.session.limit=80,s=>s.session.topic='invalid',s=>s.session.current.order.reverse(),s=>s.session.current.selected=[],s=>s.history[0].grade=1,s=>s.session.mode='exam',s=>s.session.done=true,s=>s.token={x:1}];
  for(const mutate of mutations){const s=structuredClone(saved);mutate(s);assert.throws(()=>validateState(s,bank));assert.equal(JSON.stringify(saved),before);}
});
test('200 simulated topic sessions enforce topic, distinct families, spacing, scoring, and no repeated IDs',()=>{
  const rng=seed(490);let total=0;
  for(let run=0;run<200;run++){
    const topic=['All',...Object.keys(bank.topics)][run%8];let s=start(rng,{topic,focus:'',limit:40});
    const families=new Set(),ids=new Set(),recent=[];
    while(!s.session.done){const q=findQuestion(bank,s.session.current);
      assert(topic==='All'||q.topic===topic);assert(!ids.has(q.id));ids.add(q.id);
      const f=q.track+'|'+q.evidenceFamily;assert(!families.has(f));families.add(f);
      for(const old of recent.slice(-3)){assert.notEqual(q.track,old.track);assert(!q.relatedIds.includes(old.id)&&!old.relatedIds.includes(q.id));}
      recent.push(q);s=answer(s,run%3!==0);assert.deepEqual(validateState(s,bank),s);s=nextQuestion(s,bank,rng);total++;
      assert(total<10000);
    }
    assert.deepEqual(validateState(s,bank),s);const sum=summarize(s.history,bank);assert.equal(sum.answered,ids.size);assert.equal(sum.correct,run%3!==0?ids.size:0);
  }
  assert(total>1000);
});
test('focused practice starts in the requested track, spaces it, and does not leave the selected topic',()=>{
  const q=bank.questions.find(q=>q.topic==='Pregnancy');let s=start(seed(11),{topic:q.topic,focus:q.track,limit:20});
  assert.equal(findQuestion(bank,s.session.current).track,q.track);
  s=answer(s,false);s=nextQuestion(s,bank,seed(12));if(s.session.current){assert.notEqual(findQuestion(bank,s.session.current).track,q.track);assert.equal(findQuestion(bank,s.session.current).topic,q.topic);}
});
test('difficulty evidence is track-specific; repeats and uncertain correct answers cannot advance estimates',()=>{
  const q=bank.questions[0],s=blankState(bank),track=q.track;
  const make=(q,good,confidence)=>({id:q.id,revision:q.revision,selected:q.options.filter(o=>good?o.correct:!o.correct).map(o=>o.id),confidence});
  s.history.push(make(q,false,'sure'));assert.equal(trackEstimate(s,bank,track).level,1);
  const other=bank.questions.find(x=>x.track!==track);assert.equal(trackEstimate(s,bank,other.track).level,2);
  s.history.push(make(q,true,'sure'),make(q,true,'sure'));assert.equal(trackEstimate(s,bank,track).level,1);assert.equal(trackEstimate(s,bank,track).observations,1);
  const fake={...bank,questions:[1,2,3].map(i=>({...q,id:'synthetic'+i,evidenceFamily:'family'+i,difficulty:2}))};
  const t=blankState(fake);t.history.push(make(fake.questions[0],true,'unsure'),make(fake.questions[1],true,'sure'));assert.equal(trackEstimate(t,fake,track).level,2);t.history.push(make(fake.questions[2],true,'sure'));assert.equal(trackEstimate(t,fake,track).level,3);
});
test('new sessions preserve prior responses and exhausted cases do not get padded with duplicates',()=>{
  let s=answer(start());const history=structuredClone(s.history);s=beginSession(s,{topic:'GI',focus:'',limit:10},bank,seed(3));assert.deepEqual(s.history,history);assert.equal(s.session.start,1);
  const single={...bank,questions:[bank.questions[0]]};let tiny=beginSession(blankState(single),{topic:'All',focus:'',limit:10},single,seed(1));tiny=answer(tiny);tiny=nextQuestion(tiny,single);assert(tiny.session.done);assert.match(tiny.session.endedReason,/distinct, spaced/);assert.equal(tiny.history.length,1);
});
const uiSource=fs.readFileSync(new URL('../checkpoint/app.mjs',import.meta.url),'utf8');
function commitHarness({stored='before',quota=false}={}){
  let active={id:'body'},notice=null,writes=0;
  const context=vm.createContext({SAVE_KEY,bank,state:{value:'old'},baseRaw:'before',blocked:false,busy:false,memoryOnly:false,warning:'',validateState:()=>true,
    navigator:{locks:{request:async(_key,fn)=>fn()}},
    localStorage:{getItem:()=>stored,setItem:()=>{writes++;if(quota)throw Error('quota');}},
    render:()=>{if(notice===active)active={id:'body'};notice=context.warning?{id:'notice',focus(){active=this;}}:null;},document:{getElementById:()=>notice}});
  vm.runInContext(uiSource.slice(uiSource.indexOf('function showError'),uiSource.indexOf("window.addEventListener('storage'")),context);
  return {context,active:()=>active,writes:()=>writes};
}
test('compare-before-write conflicts do not write and focus the final connected notice',async()=>{
  const h=commitHarness({stored:'remote'});assert.equal(await h.context.commit({value:'new'}),false);
  assert.equal(h.writes(),0);assert.equal(h.context.state.value,'old');assert.equal(h.context.blocked,true);assert.equal(h.active().id,'notice');
});
test('quota failures retain the new response in memory with an export warning',async()=>{
  const h=commitHarness({quota:true});assert.equal(await h.context.commit({value:'new'}),true);
  assert.equal(h.context.state.value,'new');assert.equal(h.context.memoryOnly,true);assert.match(h.context.warning,/Download progress/);
});
test('memory-only tabs remain usable after external storage writes or clears',()=>{
  let handler;const context=vm.createContext({SAVE_KEY,memoryOnly:true,baseRaw:'before',blocked:false,busy:false,warning:'',render:()=>{},window:{addEventListener:(_e,fn)=>handler=fn}});
  vm.runInContext(uiSource.slice(uiSource.indexOf("window.addEventListener('storage'"),uiSource.indexOf('\nfunction download')),context);
  handler({key:SAVE_KEY,newValue:'remote'});assert.equal(context.blocked,false);handler({key:null,newValue:null});assert.equal(context.blocked,false);
});
