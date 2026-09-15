import { SAVE_KEY, LEVEL_NAMES, blankState, beginSession, selectOption, setConfidence, submitAnswer, nextQuestion, validateState, findQuestion, score, summarize, trackEstimate } from './engine.mjs';
import bank from './bank.json' with { type: 'json' };

const root=document.getElementById('app');
const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=blankState(bank), baseRaw=null, blocked=false, busy=false, memoryOnly=false, warning='', showSetup=false, reviewIndex=null;
let settings={topic:'All',focus:'',limit:20};
try {
  baseRaw=localStorage.getItem(SAVE_KEY);
  if(baseRaw!==null) state=validateState(JSON.parse(baseRaw),bank);
} catch {
  if(baseRaw!==null) {blocked=true;warning='Saved data could not be opened. It has not been changed. Download it before restoring a valid checkpoint backup.';}
  else {memoryOnly=true;warning='Browser storage is unavailable. Use Download progress before closing this page.';}
}
if(!navigator.locks) {memoryOnly=true;warning ||= 'This browser cannot safely coordinate saved progress between tabs. Practice works in memory; download progress before closing.';}
if(state.session) settings={topic:state.session.topic,focus:state.session.focus,limit:state.session.limit};
const canAct=()=>!blocked&&!busy;
function showError(error) {warning=error instanceof Error?error.message:String(error);render();document.getElementById('notice')?.focus();}
async function commit(next,{restore=false}={}) {
  if(busy || (blocked&&!restore)) return false;
  validateState(next,bank);busy=true;render();
  try {
    if(!memoryOnly) {
      await navigator.locks.request(SAVE_KEY,async()=>{
        const actual=localStorage.getItem(SAVE_KEY);
        if(actual!==baseRaw) {blocked=true;throw Error('Another tab changed checkpoint progress. Download this tab’s progress if needed, then load the saved version. No data was overwritten.');}
        const serialized=JSON.stringify(next);
        try {localStorage.setItem(SAVE_KEY,serialized);baseRaw=serialized;}
        catch {memoryOnly=true;warning='Progress could not be saved in this browser. Your answers remain in this tab. Download progress before closing.';}
      });
    }
    state=next;
    if(restore) {blocked=false;warning=memoryOnly?'Backup restored in memory. Download progress before closing.':'Checkpoint backup restored. Original-quiz progress was not touched.';}
    return true;
  } catch(error) {warning=error instanceof Error?error.message:String(error);return false;}
  finally {busy=false;render();if(blocked)document.getElementById('notice')?.focus();}
}
window.addEventListener('storage',event=>{
  if(memoryOnly)return; // No shared writes to conflict with; preserve the local practice session.
  if(event.key===SAVE_KEY || event.key===null) {
    if(event.newValue!==baseRaw || event.key===null) {blocked=true;warning='Checkpoint progress changed in another tab. This tab is paused to prevent overwriting it. Download this tab’s progress if needed, then load the saved version.';render();}
  }
});
function download(text,name) {
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');
  a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function button(id,text,css='',disabled=false) {return `<button id="${id}" class="${css}" ${disabled?'disabled':''}>${text}</button>`;}
function sourceList(q) {return q.refs.map(r=>`<li>${r.url?`<a href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.label)}</a>`:escapeHtml(r.label)}</li>`).join('');}
function optionsHtml(q,c,submitted=false) {
  return c.order.map((id,i)=>{
    const option=q.options.find(o=>o.id===id),picked=c.selected.includes(id);
    return `<label class="option ${picked?'picked':''} ${submitted&&option.correct?'correct-option':''}">
      <input id="option-${id}" name="answer" type="${q.kind==='MC'?'radio':'checkbox'}" value="${id}" ${picked?'checked':''} ${submitted||!canAct()?'disabled':''}>
      <span class="letter" aria-hidden="true">${String.fromCharCode(65+i)}</span><span>${escapeHtml(option.text)}${submitted&&(option.correct||picked)?`<span class="option-note">${[option.correct?'Correct option':null,picked?'Your selection':null].filter(Boolean).join(' · ')}</span>`:''}</span>
    </label>`;
  }).join('');
}
function feedbackHtml(q,c) {
  const result=score(q,c.selected),keys=c.order.map((id,i)=>q.options.find(o=>o.id===id).correct?String.fromCharCode(65+i):null).filter(Boolean);
  return `<section id="feedback" class="feedback" tabindex="-1" aria-label="Answer and rationale">
    <p class="eyebrow">${result.exact?'Correct':'Review this decision'}</p>
    <h2>Correct answer${keys.length>1?'s':''}: ${keys.join(', ')}</h2>
    ${q.kind==='SATA'?`<p class="muted">Exact-match scoring: ${result.hits} of ${result.total} correct options selected; ${result.extra.length} extra selection${result.extra.length===1?'':'s'}. ${result.exact?'1':'0'} point.</p>`:''}
    <h3>The key clue</h3><p>${escapeHtml(q.clue)}</p>
    <h3>Clinical reasoning</h3><p>${escapeHtml(q.rationale)}</p>
    <h3>Why each option fits—or doesn’t</h3><div class="reasons">${c.order.map((id,i)=>{
      const o=q.options.find(o=>o.id===id);
      return `<div><h4>${String.fromCharCode(65+i)} · ${o.correct?'Correct':'Not correct'}${c.selected.includes(id)?' · Selected':''}</h4><p>${escapeHtml(o.reason)}</p></div>`;
    }).join('')}</div>
    <details><summary>Difficulty, learning objective & sources</summary><p><strong>Estimated ${LEVEL_NAMES[q.difficulty].toLowerCase()}:</strong> ${escapeHtml(q.difficultyReason)}</p><p>${escapeHtml(q.objective)}</p><p class="muted">${escapeHtml(q.skills.join(' · '))}</p><ul class="sources">${sourceList(q)}</ul></details>
  </section>`;
}
function setupHtml() {
  const topicQuestions=bank.questions.filter(q=>settings.topic==='All'||q.topic===settings.topic);
  const tracks=[...new Set(topicQuestions.map(q=>q.track))].sort((a,b)=>bank.tracks[a].localeCompare(bank.tracks[b]));
  const counts=[1,2,3].map(level=>`${topicQuestions.filter(q=>q.difficulty===level).length} ${LEVEL_NAMES[level].toLowerCase()}`).join(' · ');
  return `<section class="panel setup" aria-labelledby="setup-title"><p class="eyebrow">Make room for clinical reasoning</p><h1 id="setup-title" tabindex="-1">One decision at a time.</h1>
    <p class="lede">Practice the reviewed Exam 2 questions. Submit your answer, understand the rationale, and return to concepts that need attention.</p>
    <div class="form-grid"><label for="topic">Content area<select id="topic"><option value="All">All Exam 2 content</option>${Object.entries(bank.topics).map(([id,t])=>`<option value="${id}" ${id===settings.topic?'selected':''}>${escapeHtml(t.label)}</option>`).join('')}</select></label>
    <label for="focus">Optional focus<select id="focus"><option value="">Varied practice within this area</option>${tracks.map(id=>`<option value="${id}" ${id===settings.focus?'selected':''}>${escapeHtml(bank.tracks[id])}</option>`).join('')}</select></label>
    <label for="length">Session goal<select id="length">${[10,20,40].map(n=>`<option value="${n}" ${n===settings.limit?'selected':''}>Up to ${n} questions</option>`).join('')}</select></label></div>
    <p class="coverage">${topicQuestions.length} questions here · ${counts}<br>Sessions can finish early when distinct, spaced cases run out.</p>
    <div class="actions">${button('start','Start studying','primary',!canAct())}${state.session&&!state.session.done?button('back-session','Return to current question','secondary',!canAct()):''}</div>
    <p class="fine">Mixed difficulty · Study mode only · No hard-only 80-question exam in this checkpoint<br>AI-assisted review; independent educator review pending. Not official ATI/NCLEX material.</p>
  </section>`;
}
function questionHtml() {
  const s=state.session,c=s.current,q=findQuestion(bank,c),number=state.history.length-s.start+(c.submitted?0:1);
  return `<section class="panel question" aria-labelledby="question-title"><div class="question-top"><span>Question ${number} <span class="muted">of up to ${s.limit}</span></span><span class="pill">${q.kind==='SATA'?'Select all that apply':'Choose one'}</span></div>
    <progress value="${state.history.length-s.start}" max="${s.limit}" aria-label="Session progress"></progress>
    <p class="eyebrow">${escapeHtml(bank.topics[q.topic].label)} · ${escapeHtml(bank.tracks[q.track])}</p>
    <h1 id="question-title" class="stem" tabindex="-1">${escapeHtml(q.stem)}</h1>
    <fieldset class="answers"><legend class="sr-only">${q.kind==='MC'?'Choose one answer':'Select all correct answers'}</legend>${optionsHtml(q,c,c.submitted)}</fieldset>
    ${!c.submitted?`<fieldset class="confidence"><legend>How confident are you?</legend>${[['sure','Confident'],['unsure','Unsure'],['guess','Guessing']].map(([id,label])=>`<label><input id="confidence-${id}" type="radio" name="confidence" value="${id}" ${c.confidence===id?'checked':''} ${!canAct()?'disabled':''}><span>${label}</span></label>`).join('')}</fieldset>
      <div class="actions">${button('submit','Submit answer','primary',!canAct()||!c.selected.length||!c.confidence)}</div><p class="fine">Your response locks on submission. Rationales appear afterward.</p>`:
      feedbackHtml(q,c)+`<div class="actions">${button('next',state.history.length-s.start>=s.limit?'See session summary':'Next question','primary',!canAct())}</div>`}
    <details class="selection-note"><summary>Why this question?</summary><p>${escapeHtml(c.reason)}</p><p>Estimated ${LEVEL_NAMES[q.difficulty].toLowerCase()}. This is a learning aid—not a calibrated adaptive test or readiness score.</p></details>
  </section>`;
}
function summaryHtml() {
  const s=state.session,records=state.history.slice(s.start),stats=summarize(records,bank);
  return `<section class="panel" aria-labelledby="summary-title"><p class="eyebrow">A moment to consolidate</p><h1 id="summary-title" tabindex="-1">Session complete.</h1><p class="lede">${stats.correct} / ${stats.answered} exact matches${stats.percent===null?'':` · ${stats.percent}%`}</p><p>${escapeHtml(s.endedReason)}</p><p class="muted">This is a practice score, not a prediction of your exam result.</p><div class="actions">${button('another','Choose your next session','primary',!canAct())}</div>${reviewList(records,s.start)}</section>`;
}
function reviewList(records,start) {
  if(!records.length)return '';
  return `<details class="history"><summary>Review ${records.length} submitted response${records.length===1?'':'s'}</summary><ol>${records.map((a,i)=>{const q=findQuestion(bank,a);return `<li><button class="review-button" data-review="${start+i}">${score(q,a.selected).exact?'Correct':'Review'} · ${escapeHtml(bank.tracks[q.track])}<span>${escapeHtml(q.stem.slice(0,105))}${q.stem.length>105?'…':''}</span></button></li>`;}).join('')}</ol></details>`;
}
function historyHtml() {
  const a=state.history[reviewIndex],q=findQuestion(bank,a);
  return `<section class="panel"><p class="eyebrow">Saved response · ${escapeHtml(new Date(a.at).toLocaleDateString())}</p><h1 id="review-title" class="stem" tabindex="-1">${escapeHtml(q.stem)}</h1><div class="answers">${optionsHtml(q,a,true)}</div>${feedbackHtml(q,a)}<div class="actions">${button('close-review','Back to practice','primary')}</div></section>`;
}
function render() {
  const active=state.session&&!state.session.done;
  const total=summarize(state.history,bank);
  root.innerHTML=`<a class="skip" href="#main">Skip to study content</a><header class="site-header"><a class="brand" href="./" aria-label="NUR2460 Study Checkpoint"><img src="icons/favicon.svg" width="38" height="38" alt=""><span>NUR2460 <small>Exam 2 · Study checkpoint</small></span></a><a class="old-link" href="../">Original quiz ↗</a></header>
    <main id="main"><div class="utility"><span>${bank.questions.length} reviewed questions <span class="divider">/</span> ${total.answered} answered</span><div>${active?button('change-session','Change session','text-button',!canAct()):''}${button('export','Download progress','text-button')}${button('import','Restore backup','text-button',busy)}</div></div>
    ${warning?`<section id="notice" class="notice ${blocked?'blocked':''}" tabindex="-1" role="status"><p>${escapeHtml(warning)}</p>${blocked?`<div class="actions">${button('reload-save','Load saved version','secondary')}${button('raw-export','Download stored data','secondary')}</div>`:''}</section>`:''}
    ${reviewIndex!==null?historyHtml():showSetup||!state.session?setupHtml():state.session.done?summaryHtml():questionHtml()}
    <details class="about"><summary>About this checkpoint & your progress</summary><p>Original course-aligned questions based primarily on Exam 2 instructor notes, supplemented by lectures, supplied textbooks and relevant primary guidance. Reviewed through an AI-assisted content process; independent nursing-educator review is still pending. Not official ATI or NCLEX material, clinical advice, or a calibrated test.</p>
    <p>Difficulty starts at intermediate within each track. An incorrect first encounter lowers that track’s estimate; two confident correct first encounters from distinct evidence families at the target level raise it. Repeat families do not advance the estimate. Questions within the same track, and identified related cases, are separated by at least three other answered questions. A focus is interleaved with other tracks in its topic for spacing. Select a content area to keep practice inside it.</p>
    <p>Available difficulty is uneven: 75 foundational, 172 intermediate and 14 advanced questions. “Advanced” is an author/reviewer estimate, not proven hard-only exam eligibility. Sessions may end early when spaced, distinct cases run out. MC and SATA each earn one point only for an exact match; option-level feedback explains partial SATA selections. No NCLEX pass probability or mastery certification is calculated.</p>
    <p>Progress stays in this browser under a checkpoint-only key; no accounts, analytics or cloud score storage. Original-quiz backups are deliberately not imported. Options are shuffled on each new presentation and keep their order on resume. Download backups to move between devices. Imports replace only checkpoint progress after validation and confirmation. Files from a different checkpoint version are rejected rather than silently regraded.</p>
    <p>The original Exam 2 blueprint weights are Pregnancy 15, Labor 15, Newborn 15, GYN 15, Growth 10, Skin 5 and GI 5 out of 80. Study sessions do not enforce those exam quotas. The requested hard-only exam is held for a later release.</p>
    ${state.history.length?reviewList(state.history,0):''}<p class="fine">Version ${bank.version} · Educational use only. Actual care follows current local policy and patient-specific orders.</p></details>
    <footer>Small sessions. Thoughtful decisions. <span>${memoryOnly?'In-memory progress—download before closing':'Saved only in this browser'}</span></footer></main><input id="backup-file" type="file" accept="application/json,.json" hidden>`;
  bind();
}
function on(id,event,fn){document.getElementById(id)?.addEventListener(event,fn);}
function bind() {
  on('topic','change',e=>{settings.topic=e.target.value;settings.focus='';render();document.getElementById('topic')?.focus();});
  on('focus','change',e=>{settings.focus=e.target.value;});
  on('length','change',e=>{settings.limit=Number(e.target.value);});
  on('start','click',async()=>{
    if(state.session&&!state.session.done&&!confirm('Start a new session? Submitted responses stay in your history. The current question and any unsubmitted selection will be replaced.'))return;
    showSetup=false;reviewIndex=null;
    try {if(await commit(beginSession(state,settings,bank)))document.getElementById('question-title')?.focus();}catch(error){showError(error);}
  });
  for(const id of ['change-session','another'])on(id,'click',()=>{showSetup=true;reviewIndex=null;render();document.getElementById('setup-title')?.focus();});
  on('back-session','click',()=>{showSetup=false;render();document.getElementById('question-title')?.focus();});
  root.querySelectorAll('input[name="answer"]').forEach(input=>input.addEventListener('change',async e=>{const id=e.target.id;try{if(await commit(selectOption(state,e.target.value,bank)))document.getElementById(id)?.focus();}catch(error){showError(error);}}));
  root.querySelectorAll('input[name="confidence"]').forEach(input=>input.addEventListener('change',async e=>{const id=e.target.id;try{if(await commit(setConfidence(state,e.target.value)))document.getElementById(id)?.focus();}catch(error){showError(error);}}));
  on('submit','click',async()=>{try{if(await commit(submitAnswer(state,bank)))document.getElementById('feedback')?.focus();}catch(error){showError(error);}});
  on('next','click',async()=>{try{if(await commit(nextQuestion(state,bank)))document.getElementById(state.session.done?'summary-title':'question-title')?.focus();}catch(error){showError(error);}});
  on('export','click',()=>download(JSON.stringify(state,null,2),'NUR2460-study-checkpoint-progress.json'));
  on('raw-export','click',()=>{try{download(localStorage.getItem(SAVE_KEY)??baseRaw??'null','NUR2460-checkpoint-stored-recovery.json');}catch{download(baseRaw??'null','NUR2460-checkpoint-stored-recovery.json');}});
  on('reload-save','click',()=>{if(confirm('Load the version currently saved in this browser? Download this tab’s progress first if you want to keep it.'))location.reload();});
  on('import','click',()=>document.getElementById('backup-file').click());
  on('backup-file','change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try {
      if(file.size>8_000_000)throw Error('Backup is too large. Nothing was changed.');
      const candidate=validateState(JSON.parse(await file.text()),bank);
      if(!confirm(`Restore ${candidate.history.length} submitted responses? This replaces only checkpoint progress. Download your current checkpoint progress first if needed. Original-quiz progress is not affected.`))return;
      if(blocked) { // Explicit recovery approval adopts the currently stored baseline, still under the save lock.
        try {baseRaw=localStorage.getItem(SAVE_KEY);}catch {memoryOnly=true;}
      }
      candidate.revision=Math.max(candidate.revision,state.revision)+1;candidate.token=crypto.randomUUID();
      if(await commit(candidate,{restore:true})) {showSetup=false;reviewIndex=null;render();}
    }catch(error){showError(error instanceof SyntaxError?Error('This file is not valid JSON. Current progress was not changed.'):error);}
  });
  root.querySelectorAll('[data-review]').forEach(b=>b.addEventListener('click',()=>{reviewIndex=Number(b.dataset.review);render();document.getElementById('review-title')?.focus();}));
  on('close-review','click',()=>{reviewIndex=null;render();document.getElementById(state.session?.done?'summary-title':'question-title')?.focus();});
}
render();
