// Checkpoint-only engine. Never reads or migrates the original quiz's saves.
export const SAVE_KEY = 'nur2460-study-checkpoint-1';
export const SAVE_SCHEMA = 'nur2460-study-checkpoint-save-1';
export const LEVEL_NAMES = {1:'Foundational',2:'Intermediate',3:'Advanced'};
export const CONFIDENCES = ['sure','unsure','guess'];
export function random() { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; }
export function shuffle(values, rng = random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function score(question, selected) {
  const keys = question.options.filter(o => o.correct).map(o => o.id);
  const missed = keys.filter(id => !selected.includes(id));
  const extra = selected.filter(id => !keys.includes(id));
  return {exact: !missed.length && !extra.length, missed, extra,
    hits: keys.length - missed.length, total: keys.length};
}
export function findQuestion(bank, record) {
  const q = bank.questions.find(q => q.id === record.id && q.revision === record.revision);
  if (!q) throw Error('This backup contains an unavailable question revision. Nothing was replaced.');
  return q;
}
export function blankState(bank) {
  return {schema:SAVE_SCHEMA,bankVersion:bank.version,revision:0,token:'new',history:[],session:null};
}
function touched(state) { state.revision++; state.token = crypto.randomUUID(); return state; }
function family(q) { return `${q.track}|${q.evidenceFamily}`; }
// Only first encounters with distinct evidence families in this exact track can
// advance the estimate. Confidence is self-report, not proof of understanding.
export function trackEstimate(state, bank, track) {
  const seen = new Set(); let level = 2, streak = 0, observations = 0;
  for (const a of state.history) {
    const q = findQuestion(bank,a);
    if (q.track !== track || seen.has(family(q))) continue;
    seen.add(family(q)); observations++;
    if (!score(q,a.selected).exact) {level = Math.max(1,level-1);streak=0;}
    else if (a.confidence === 'sure' && q.difficulty >= level) {
      if (++streak >= 2) {level = Math.min(3,level+1);streak=0;}
    } else streak=0;
  }
  return {level,observations};
}
function eligiblePool(state,bank) {
  const s = state.session;
  const answered = state.history.slice(s.start);
  const used = new Set(answered.map(a => family(findQuestion(bank,a))));
  const recent = state.history.slice(-3).map(a => findQuestion(bank,a));
  return bank.questions.filter(q => (s.topic === 'All' || q.topic === s.topic)
    && !used.has(family(q)) && !recent.some(old => old.track === q.track
      || q.relatedIds.includes(old.id) || old.relatedIds.includes(q.id)));
}
export function chooseQuestion(state,bank,rng=random) {
  const s=state.session;
  if (!s || state.history.length-s.start >= s.limit) return null;
  const pool=eligiblePool(state,bank);
  if (!pool.length) return null;
  const seenFamilies=new Set(state.history.map(a=>family(findQuestion(bank,a))));
  const seenIds=new Set(state.history.map(a=>a.id));
  const usedTracks=state.history.slice(s.start).map(a=>findQuestion(bank,a).track);
  const last=state.history.at(-1);
  const lastQ=last ? findQuestion(bank,last) : null;
  // Return to a weak track after spacing, while never exceeding its topic filter.
  const weakTrack=[...state.history].reverse().find(a=>!score(findQuestion(bank,a),a.selected).exact);
  const weak=weakTrack ? findQuestion(bank,weakTrack).track : null;
  const weighted=shuffle(pool,rng).map(q=>{
    const target=trackEstimate(state,bank,q.track).level;
    let weight=0;
    if (!seenIds.has(q.id)) weight+=16;
    if (!seenFamilies.has(family(q))) weight+=8;
    if (s.focus && q.track===s.focus) weight+=40;
    if (!s.focus && q.track===weak && q.track!==lastQ?.track) weight+=5;
    weight-=usedTracks.filter(t=>t===q.track).length*4;
    weight-=Math.abs(q.difficulty-target)*5;
    return {q,weight,target};
  }).sort((a,b)=>b.weight-a.weight);
  const {q,target}=weighted[0];
  const review=seenFamilies.has(family(q));
  let reason = s.focus && q.track!==s.focus
    ? 'A spaced question within your selected topic before returning to your focus.'
    : `Selected within ${bank.tracks[q.track]}. Difficulty uses this track only.`;
  if(q.difficulty!==target) reason+=` Estimated target: ${LEVEL_NAMES[target]}. No eligible unseen case at that level was selected; this is ${LEVEL_NAMES[q.difficulty].toLowerCase()} practice.`;
  if(review) reason+=' This family has been seen before; it will not advance the difficulty estimate.';
  return {id:q.id,revision:q.revision,order:shuffle(q.options.map(o=>o.id),rng),selected:[],confidence:null,submitted:false,reason,review};
}
export function beginSession(previous, settings, bank, rng=random) {
  if (!(settings.topic === 'All' || Object.hasOwn(bank.topics,settings.topic))) throw Error('Choose a valid topic.');
  if (![10,20,40].includes(settings.limit)) throw Error('Choose a valid session length.');
  if (settings.focus && !bank.questions.some(q=>q.track===settings.focus && (settings.topic==='All'||q.topic===settings.topic))) throw Error('Choose a focus within the selected topic.');
  const state=structuredClone(previous);
  const topic=settings.focus && settings.topic==='All' ? bank.questions.find(q=>q.track===settings.focus).topic : settings.topic;
  state.session={id:crypto.randomUUID(),start:state.history.length,topic,focus:settings.focus||'',limit:settings.limit,done:false,current:null,endedReason:''};
  state.session.current=chooseQuestion(state,bank,rng);
  if (!state.session.current) {state.session.done=true;state.session.endedReason='No spaced cases remain for this topic right now. Try a different topic before returning.';}
  return touched(state);
}
export function selectOption(previous,id,bank) {
  const state=structuredClone(previous), c=state.session?.current;
  if(!c || c.submitted || state.session.done) throw Error('This response is locked.');
  const q=findQuestion(bank,c);
  if(!q.options.some(o=>o.id===id)) throw Error('Unknown option.');
  c.selected=q.kind==='MC' ? [id] : c.selected.includes(id) ? c.selected.filter(x=>x!==id) : [...c.selected,id];
  return touched(state);
}
export function setConfidence(previous,confidence) {
  const state=structuredClone(previous),c=state.session?.current;
  if(!c || c.submitted || state.session.done || !CONFIDENCES.includes(confidence)) throw Error('This response is locked.');
  c.confidence=confidence;return touched(state);
}
export function submitAnswer(previous,bank,at=new Date().toISOString()) {
  const state=structuredClone(previous),c=state.session?.current;
  if(!c || c.submitted || state.session.done) throw Error('This response is already locked.');
  if(!c.selected.length || !c.confidence) throw Error('Choose an answer and your confidence before submitting.');
  const q=findQuestion(bank,c);
  if(q.kind==='MC' && c.selected.length!==1) throw Error('Choose one answer.');
  state.history.push({id:c.id,revision:c.revision,order:[...c.order],selected:[...c.selected],confidence:c.confidence,at,sessionId:state.session.id});
  c.submitted=true;return touched(state);
}
export function nextQuestion(previous,bank,rng=random) {
  const state=structuredClone(previous),s=state.session;
  if(!s || s.done || !s.current?.submitted) throw Error('Submit this response first.');
  s.current=chooseQuestion(state,bank,rng);
  if(!s.current) {
    s.done=true;
    s.endedReason=state.history.length-s.start>=s.limit ? 'Your planned session is complete.' : 'You reached the available distinct, spaced cases for this topic. No duplicates were added to fill the session.';
  }
  return touched(state);
}
const fail=()=>{throw Error('This is not a valid backup for Study Checkpoint 1. Your current progress was not replaced.');};
function exactKeys(value,keys) {return value && typeof value==='object' && !Array.isArray(value) && Object.keys(value).sort().join('|')===keys.sort().join('|');}
function validIds(ids,allowed,{full=false}={}) {
  return Array.isArray(ids) && ids.every(x=>typeof x==='string'&&allowed.includes(x)) && new Set(ids).size===ids.length && (!full || ids.length===allowed.length);
}
export function validateState(raw,bank) {
  if(!exactKeys(raw,['schema','bankVersion','revision','token','history','session']) || raw.schema!==SAVE_SCHEMA || raw.bankVersion!==bank.version
    || !Number.isSafeInteger(raw.revision) || raw.revision<0 || typeof raw.token!=='string' || raw.token.length>100 || !Array.isArray(raw.history) || raw.history.length>10000) fail();
  const checkRecord=(a,submitted)=>{
    const q=findQuestion(bank,a),ids=q.options.map(o=>o.id);
    if(!validIds(a.order,ids,{full:true}) || !validIds(a.selected,ids) || (q.kind==='MC' && a.selected.length>1)
      || (submitted && (!a.selected.length || !CONFIDENCES.includes(a.confidence)))
      || (!submitted && a.confidence!==null && !CONFIDENCES.includes(a.confidence))) fail();
  };
  for(const a of raw.history) {
    if(!exactKeys(a,['id','revision','order','selected','confidence','at','sessionId']) || typeof a.sessionId!=='string' || !a.sessionId.length || a.sessionId.length>100
      || typeof a.at!=='string' || a.at.length>40 || !Number.isFinite(Date.parse(a.at))) fail();
    checkRecord(a,true);
  }
  const s=raw.session;
  if(s!==null) {
    if(!exactKeys(s,['id','start','topic','focus','limit','done','current','endedReason']) || typeof s.id!=='string' || !s.id.length || s.id.length>100
      || !Number.isSafeInteger(s.start) || s.start<0 || s.start>raw.history.length || ![10,20,40].includes(s.limit)
      || !(s.topic==='All'||Object.hasOwn(bank.topics,s.topic)) || typeof s.focus!=='string'
      || (s.focus && s.topic==='All')
      || (s.focus && !bank.questions.some(q=>q.track===s.focus && (s.topic==='All'||q.topic===s.topic)))
      || typeof s.done!=='boolean' || typeof s.endedReason!=='string' || s.endedReason.length>300) fail();
    const answered=raw.history.slice(s.start), families=new Set();
    if(answered.length>s.limit) fail();
    for(const a of answered) {const q=findQuestion(bank,a); if(a.sessionId!==s.id || (s.topic!=='All'&&q.topic!==s.topic) || families.has(family(q))) fail();families.add(family(q));}
    if(s.done) {if(s.current!==null) fail();}
    else {
      const c=s.current;
      if(!exactKeys(c,['id','revision','order','selected','confidence','submitted','reason','review']) || typeof c.submitted!=='boolean' || typeof c.review!=='boolean'
        || typeof c.reason!=='string' || c.reason.length>1200) fail();
      checkRecord(c,c.submitted);
      const q=findQuestion(bank,c);
      if(s.topic!=='All'&&q.topic!==s.topic) fail();
      if(c.submitted) {
        const a=answered.at(-1);
        if(!a || ['id','revision','order','selected','confidence'].some(k=>JSON.stringify(a[k])!==JSON.stringify(c[k]))) fail();
      } else if(families.has(family(q)) || answered.length>=s.limit) fail();
    }
  } else if(raw.history.length) fail();
  return structuredClone(raw);
}
export function summarize(records,bank) {
  const correct=records.filter(a=>score(findQuestion(bank,a),a.selected).exact).length;
  return {answered:records.length,correct,percent:records.length ? Math.round(correct/records.length*100) : null};
}
