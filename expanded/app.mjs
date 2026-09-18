import { SAVE_KEY, LEVEL_NAMES, blankState, beginSession, selectOption, setConfidence, submitAnswer, nextQuestion, validateState, findQuestion, score, summarize, trackEstimate, activeProvenance, historyContext, assertImmutableLedger } from './engine.mjs';
import { HARD80_SAVE_KEY, blankHard80State, beginHard80Exam, selectHard80Option, nextHard80Question, completeHard80Exam, hard80Summary, hard80QuestionView, validateHard80State } from './hard80.mjs';
import { allowedTopicsForWeek, cancelReplacement, reconcileWeekDraft, trackTopic, weekLabel } from './week-mapping.mjs';
import bank from './bank.json' with { type: 'json' };

const root=document.getElementById('app');
const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=blankState(bank), baseRaw=null, blocked=false, memoryOnly=false, warning='', showSetup=false, reviewIndex=null;
let examState=blankHard80State(bank), examBaseRaw=null, examBlocked=false, examMemoryOnly=false, examWarning='', examReviewIndex=null;
let busy=false, mode='study';
let settings={week:'All',topic:'All',focus:'',limit:20}, setupStatus='';
try {
  baseRaw=localStorage.getItem(SAVE_KEY);
  if(baseRaw!==null) state=validateState(JSON.parse(baseRaw),bank);
} catch(error) {
  if(baseRaw!==null) {blocked=true;warning=error?.code==='MAPPING_UNAVAILABLE'?'Saved Study progress needs an unavailable or mismatched week mapping. It has not been changed; download the stored data before restoring a compatible backup.':'Saved data could not be opened. It has not been changed. Download it before restoring a valid Exam 2 Expanded 445 Study backup.';}
  else {memoryOnly=true;warning='Browser storage is unavailable. Use Download progress before closing this page.';}
}
try {
  examBaseRaw=localStorage.getItem(HARD80_SAVE_KEY);
  if(examBaseRaw!==null) examState=validateHard80State(JSON.parse(examBaseRaw),bank);
} catch {
  if(examBaseRaw!==null) {examBlocked=true;examWarning='Saved Hard 80 data could not be opened. It has not been changed. Download it before restoring a valid Exam 2 Expanded 445 Hard 80 backup.';}
  else {examMemoryOnly=true;examWarning='Browser storage is unavailable. Hard 80 works in memory; download progress before closing this page.';}
}
if(!navigator.locks) {
  memoryOnly=true;examMemoryOnly=true;
  warning ||= 'This browser cannot safely coordinate saved progress between tabs. Practice works in memory; download progress before closing.';
  examWarning ||= 'This browser cannot safely coordinate saved progress between tabs. Hard 80 works in memory; download progress before closing.';
}
if(state.session) {
  const filter=activeProvenance(state).filter;
  settings={week:filter.week,topic:filter.topic,focus:filter.focus,limit:filter.limit};
}
const canAct=()=>!(mode==='hard80'?examBlocked:blocked)&&!busy;
function showError(error) {if(mode==='hard80')examWarning=error instanceof Error?error.message:String(error);else warning=error instanceof Error?error.message:String(error);render();document.getElementById('notice')?.focus();}
// A newly failed save must take focus priority over the normal next control.
// Existing memory-only mode does not keep stealing focus on later actions.
let focusRecoveryNotice=false;
function focusAfterCommit(id) {
  document.getElementById(focusRecoveryNotice?'notice':id)?.focus();
  focusRecoveryNotice=false;
}
function focusModeLanding(id) {
  const conflictVisible=mode==='study'?blocked:examBlocked;
  document.getElementById(conflictVisible?'notice':id)?.focus();
}
async function commit(next,{restore=false}={}) {
  if(busy || (blocked&&!restore)) return false;
  validateState(next,bank);if(!restore)assertImmutableLedger(state,next);focusRecoveryNotice=false;busy=true;render();
  try {
    if(!memoryOnly) {
      await navigator.locks.request(SAVE_KEY,async()=>{
        const actual=localStorage.getItem(SAVE_KEY);
        if(actual!==baseRaw) {blocked=true;throw Error('Another tab changed study progress. Download this tab’s progress if needed, then load the saved version. No data was overwritten.');}
        const serialized=JSON.stringify(next);
        try {localStorage.setItem(SAVE_KEY,serialized);baseRaw=serialized;}
        catch {memoryOnly=true;focusRecoveryNotice=true;warning='Progress could not be saved in this browser. Your answers remain in this tab. Download progress before closing.';}
      });
    }
    state=next;
    if(restore) {blocked=false;warning=memoryOnly?'Backup restored in memory. Download progress before closing.':'Exam 2 Expanded 445 Study backup restored. Earlier-version progress was not touched.';}
    return true;
  } catch(error) {warning=error instanceof Error?error.message:String(error);return false;}
  finally {busy=false;render();if(blocked||focusRecoveryNotice)document.getElementById('notice')?.focus();}
}
async function commitExam(next,{restore=false}={}) {
  if(busy || (examBlocked&&!restore)) return false;
  validateHard80State(next,bank);focusRecoveryNotice=false;busy=true;render();
  try {
    if(!examMemoryOnly) {
      await navigator.locks.request(HARD80_SAVE_KEY,async()=>{
        const actual=localStorage.getItem(HARD80_SAVE_KEY);
        if(actual!==examBaseRaw) {examBlocked=true;throw Error('Another tab changed Hard 80 progress. Download this tab’s progress if needed, then load the saved version. No data was overwritten.');}
        const serialized=JSON.stringify(next);
        try {localStorage.setItem(HARD80_SAVE_KEY,serialized);examBaseRaw=serialized;}
        catch {examMemoryOnly=true;focusRecoveryNotice=true;examWarning='Hard 80 progress could not be saved. Your selections remain in this tab. Download progress before closing.';}
      });
    }
    examState=next;
    if(restore) {examBlocked=false;examWarning=examMemoryOnly?'Hard 80 backup restored in memory. Download progress before closing.':'Hard 80 backup restored. Study and earlier-version progress were not touched.';}
    return true;
  } catch(error) {examWarning=error instanceof Error?error.message:String(error);return false;}
  finally {busy=false;render();if(examBlocked||focusRecoveryNotice)document.getElementById('notice')?.focus();}
}
window.addEventListener('storage',event=>{
  let changed=false,affectedActiveMode=false;
  if(!memoryOnly&&(event.key===SAVE_KEY || event.key===null)) {
    if(event.newValue!==baseRaw || event.key===null) {blocked=true;warning='Study progress changed in another tab. This tab is paused to prevent overwriting it. Download this tab’s progress if needed, then load the saved version.';changed=true;affectedActiveMode ||= mode==='study';}
  }
  if(!examMemoryOnly&&(event.key===HARD80_SAVE_KEY || event.key===null)) {
    if(event.newValue!==examBaseRaw || event.key===null) {examBlocked=true;examWarning='Hard 80 progress changed in another tab. This tab is paused to prevent overwriting it. Download this tab’s progress if needed, then load the saved version.';changed=true;affectedActiveMode ||= mode==='hard80';}
  }
  if(changed){render();if(affectedActiveMode)document.getElementById('notice')?.focus();}
});
function download(text,name) {
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');
  a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function button(id,text,css='',disabled=false) {return `<button id="${id}" class="${css}" ${disabled?'disabled':''}>${text}</button>`;}
function sourceList(q) {return q.refs.map(r=>`<li>${r.url?`<a href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.label)}</a>`:escapeHtml(r.label)}</li>`).join('');}
function coverageDescription(questions) {
  return [1,2,3].map(level=>`${questions.filter(q=>q.difficulty===level).length} ${LEVEL_NAMES[level].toLowerCase()}`).join(' · ');
}
function optionFeedback(option,picked,submitted) {
  if(!submitted)return {className:picked?'picked':'',label:'',symbol:''};
  if(option.correct&&picked)return {className:'graded-option correct-selected',label:'Correct · Selected',symbol:'✓'};
  if(picked)return {className:'graded-option wrong-selected',label:'Incorrect · Selected',symbol:'✕'};
  if(option.correct)return {className:'graded-option missed-correct',label:'Missed correct answer',symbol:'!'};
  return {className:'graded-option not-selected',label:'Not selected',symbol:'–'};
}
function optionsHtml(q,c,submitted=false) {
  return c.order.map((id,i)=>{
    const option=q.options.find(o=>o.id===id),picked=c.selected.includes(id);
    const feedback=optionFeedback(option,picked,submitted);
    return `<label class="option ${feedback.className}">
      <input id="option-${id}" name="answer" type="${q.kind==='MC'?'radio':'checkbox'}" value="${id}" ${picked?'checked':''} ${submitted||!canAct()?'disabled':''}>
      <span class="letter" aria-hidden="true">${String.fromCharCode(65+i)}</span><span>${escapeHtml(option.text)}${submitted?`<span class="option-note"><span class="feedback-symbol" aria-hidden="true">${feedback.symbol}</span>${feedback.label}</span>`:''}</span>
    </label>`;
  }).join('');
}
function feedbackHtml(q,c) {
  const result=score(q,c.selected),keys=c.order.map((id,i)=>q.options.find(o=>o.id===id).correct?String.fromCharCode(65+i):null).filter(Boolean);
  return `<section id="feedback" class="feedback" tabindex="-1" aria-label="Answer and rationale">
    <p class="eyebrow ${result.exact?'result-correct':'result-incorrect'}">${result.exact?'Correct':'Incorrect · Review this decision'}</p>
    <h2>Correct answer${keys.length>1?'s':''}: ${keys.join(', ')}</h2>
    ${q.kind==='SATA'?`<p class="muted">Exact-match scoring: ${result.hits} of ${result.total} correct options selected; ${result.extra.length} extra selection${result.extra.length===1?'':'s'}. ${result.exact?'1':'0'} point.</p>`:''}
    <h3>The key clue</h3><p>${escapeHtml(q.clue)}</p>
    <h3>Clinical reasoning</h3><p>${escapeHtml(q.rationale)}</p>
    ${q.correctionNotice?`<aside class="notice"><p>${escapeHtml(q.correctionNotice)}</p></aside>`:''}
    ${q.limitations?.length?`<details><summary>Case boundaries</summary><ul>${q.limitations.map(text=>`<li>${escapeHtml(text)}</li>`).join('')}</ul></details>`:''}
    <h3>Why each option fits—or doesn’t</h3><div class="reasons">${c.order.map((id,i)=>{
      const o=q.options.find(o=>o.id===id);
      const feedback=optionFeedback(o,c.selected.includes(id),true);
      return `<div class="${feedback.className}"><h4>${String.fromCharCode(65+i)} · ${feedback.label}</h4><p>${escapeHtml(o.reason)}</p></div>`;
    }).join('')}</div>
    <details><summary>Difficulty, learning objective & sources</summary><p><strong>Estimated ${LEVEL_NAMES[q.difficulty].toLowerCase()}:</strong> ${escapeHtml(q.difficultyReason)}</p><p>${escapeHtml(q.objective)}</p><p class="muted">${escapeHtml(q.skills.join(' · '))}</p><p class="fine">References include course topic locators and supplemental care guidance; not every source supports every case detail. Patient-specific values and orders in a case are not universal treatment rules. Read the case boundaries above when provided.</p><ul class="sources">${sourceList(q)}</ul></details>
  </section>`;
}
function setupHtml() {
  const allowedTopics=allowedTopicsForWeek(settings.week);
  const weekQuestions=bank.questions.filter(q=>allowedTopics.includes(q.topic));
  const topicQuestions=weekQuestions.filter(q=>settings.topic==='All'||q.topic===settings.topic);
  const tracks=[...new Set(topicQuestions.map(q=>q.track))].sort((a,b)=>bank.tracks[a].localeCompare(bank.tracks[b]));
  const counts=coverageDescription(topicQuestions);
  const focused=settings.focus?topicQuestions.filter(q=>q.track===settings.focus):[];
  const estimate=settings.focus?trackEstimate(state,bank,settings.focus):null;
  return `<section class="panel setup" aria-labelledby="setup-title"><p class="eyebrow">Make room for clinical reasoning</p><h1 id="setup-title" tabindex="-1">One decision at a time.</h1>
    <p class="lede">Practice the reviewed Exam 2 questions. Submit your answer, understand the rationale, and return to concepts that need attention.</p>
    <div class="form-grid"><label for="week">Week<select id="week"><option value="All" ${settings.week==='All'?'selected':''}>All weeks</option>${[4,5,6,7].map(week=>`<option value="${week}" ${week===settings.week?'selected':''}>Week ${week}</option>`).join('')}</select></label>
    <label for="topic">Content area<select id="topic"><option value="All">${settings.week==='All'?'All Exam 2 content':`All content in Week ${settings.week}`}</option>${allowedTopics.map(id=>`<option value="${id}" ${id===settings.topic?'selected':''}>${escapeHtml(bank.topics[id].label)}</option>`).join('')}</select></label>
    <label for="focus">Optional focus<select id="focus"><option value="">Varied practice within this area</option>${tracks.map(id=>`<option value="${id}" ${id===settings.focus?'selected':''}>${settings.topic==='All'?escapeHtml(bank.topics[topicQuestions.find(q=>q.track===id).topic].label)+' · ':''}${escapeHtml(bank.tracks[id])}</option>`).join('')}</select></label>
    <label for="length">Session goal<select id="length">${[10,20,40].map(n=>`<option value="${n}" ${n===settings.limit?'selected':''}>Up to ${n} questions</option>`).join('')}</select></label></div>
    <p id="setup-status" class="setup-status" role="status">${escapeHtml(setupStatus)}</p>
    <p class="coverage">${topicQuestions.length} questions in ${weekLabel(settings.week)} · ${settings.topic==='All'?'all content':escapeHtml(bank.topics[settings.topic].label)} · ${counts}<br>Sessions can finish early when distinct, spaced cases inside the effective filters run out.</p>
    ${settings.focus?`<p class="focus-coverage"><strong>${escapeHtml(bank.tracks[settings.focus])}</strong><br>${focused.length} questions · ${coverageDescription(focused)}<br>Current target: ${LEVEL_NAMES[estimate.level]} · ${estimate.observations} distinct practice observations.<br>Other tracks in this content area provide spacing between focus questions. Missing levels are not treated as mastered.</p>`:''}
    <div class="actions">${button('start','Start studying','primary',!canAct())}${state.session&&!state.session.done?button('back-session','Return to current question','secondary',!canAct()):''}</div>
    <p class="fine">Adaptive mixed-difficulty Study mode · AI-assisted review; independent educator review pending. Not official ATI/NCLEX material.</p>
    <div class="mode-choice"><h2>Hard 80 exam</h2><p>Start or resume the separate 80-question hard-eligible form. It uses exact blueprint quotas, does not shorten or substitute questions, and withholds scoring and explanations until explicit completion.</p><div class="actions">${button('open-hard80',examState.attempt&&examState.attempt.completedAt===null?'Continue Hard 80 exam':'Open Hard 80 exam','secondary',busy)}</div></div>
  </section>`;
}
function questionHtml() {
  const s=state.session,p=activeProvenance(state),filter=p.filter,c=s.current,q=findQuestion(bank,c),number=state.history.length-p.start+(c.submitted?0:1);
  return `<section class="panel question" aria-labelledby="question-title"><div class="question-top"><span>Question ${number} <span class="muted">of up to ${filter.limit}</span></span><span class="pill">${q.kind==='SATA'?'Select all that apply':'Choose one'}</span></div>
    <progress value="${state.history.length-p.start}" max="${filter.limit}" aria-label="Session progress"></progress>
    <p class="eyebrow">${weekLabel(filter.week)} · ${escapeHtml(bank.topics[q.topic].label)} · ${escapeHtml(bank.tracks[q.track])}</p>
    <h1 id="question-title" class="stem" tabindex="-1">${escapeHtml(q.stem)}</h1>
    <fieldset class="answers"><legend class="sr-only">${q.kind==='MC'?'Choose one answer':'Select all correct answers'}</legend>${optionsHtml(q,c,c.submitted)}</fieldset>
    ${!c.submitted?`<fieldset class="confidence"><legend>How confident are you?</legend>${[['sure','Confident'],['unsure','Unsure'],['guess','Guessing']].map(([id,label])=>`<label><input id="confidence-${id}" type="radio" name="confidence" value="${id}" ${c.confidence===id?'checked':''} ${!canAct()?'disabled':''}><span>${label}</span></label>`).join('')}</fieldset>
      <div class="actions">${button('submit','Submit answer','primary',!canAct()||!c.selected.length||!c.confidence)}</div><p class="fine">Your response locks on submission. Rationales appear afterward.</p>`:
      feedbackHtml(q,c)+`<div class="actions">${button('next',state.history.length-p.start>=filter.limit?'See session summary':'Next question','primary',!canAct())}</div>`}
    <details class="selection-note"><summary>Why this question?</summary><p>${escapeHtml(c.reason)}</p><p>Estimated ${LEVEL_NAMES[q.difficulty].toLowerCase()}. This is a learning aid—not a calibrated adaptive test or readiness score.</p></details>
  </section>`;
}
function summaryHtml() {
  const s=state.session,p=activeProvenance(state),records=state.history.slice(p.start),stats=summarize(records,bank);
  return `<section class="panel" aria-labelledby="summary-title"><p class="eyebrow">${weekLabel(p.filter.week)} · ${p.filter.topic==='All'?'All content':escapeHtml(bank.topics[p.filter.topic].label)}</p><h1 id="summary-title" tabindex="-1">Session complete.</h1><p class="lede">${stats.correct} / ${stats.answered} exact matches${stats.percent===null?'':` · ${stats.percent}%`}</p><p>${escapeHtml(s.endedReason)}</p><p class="muted">This is a practice score, not a prediction of your exam result.</p><div class="actions">${button('another','Choose your next session','primary',!canAct())}</div>${reviewList(records,p.start)}</section>`;
}
function reviewList(records,start) {
  if(!records.length)return '';
  return `<details class="history"><summary>Review ${records.length} submitted response${records.length===1?'':'s'}</summary><ol>${records.map((a,i)=>{const context=historyContext(state,start+i,bank),q=context.question,filter=context.provenance.filter;return `<li><button class="review-button" data-review="${start+i}">${score(q,a.selected).exact?'Correct':'Review'} · ${weekLabel(filter.week)} · ${escapeHtml(bank.tracks[q.track])}<span>${escapeHtml(q.stem.slice(0,105))}${q.stem.length>105?'…':''}</span></button></li>`;}).join('')}</ol></details>`;
}
function historyHtml() {
  const context=historyContext(state,reviewIndex,bank),a=context.record,q=context.question,filter=context.provenance.filter;
  return `<section class="panel"><p class="eyebrow">Saved response · ${weekLabel(filter.week)} · ${filter.topic==='All'?'All content':escapeHtml(bank.topics[filter.topic].label)} · ${escapeHtml(new Date(a.at).toLocaleDateString())}</p><p class="fine">Saved with ${escapeHtml(filter.weekMapVersion)}.</p><h1 id="review-title" class="stem" tabindex="-1">${escapeHtml(q.stem)}</h1><div class="answers">${optionsHtml(q,a,true)}</div>${feedbackHtml(q,a)}<div class="actions">${button('close-review','Back to practice','primary')}</div></section>`;
}
function hard80OptionsHtml(view,review=false) {
  return view.options.map(option=>{const feedback=optionFeedback(option,option.selected,review);return `<label class="option ${feedback.className}">
    <input id="exam-option-${option.id}" name="exam-answer" type="${view.kind==='MC'?'radio':'checkbox'}" value="${option.id}" ${option.selected?'checked':''} ${review||!canAct()?'disabled':''}>
    <span class="letter" aria-hidden="true">${option.letter}</span><span>${escapeHtml(option.text)}${review?`<span class="option-note"><span class="feedback-symbol" aria-hidden="true">${feedback.symbol}</span>${feedback.label}</span>`:''}</span>
  </label>`;}).join('');
}
function hard80SetupHtml() {
  const attempt=examState.attempt,inProgress=attempt&&attempt.completedAt===null;
  return `<section class="panel setup" aria-labelledby="exam-setup-title"><p class="eyebrow">Separate full exam mode</p><h1 id="exam-setup-title" tabindex="-1">Hard 80 exam</h1>
    <p class="lede">Exactly 80 hard-eligible questions: Pregnancy 15, Labor 15, Newborn 15, GYN 15, Growth 10, Skin 5 and GI 5. Question and option order vary; saved stable IDs preserve the displayed letters on reload.</p>
    <ul><li>MC and SATA use exact-match scoring.</li><li>All 80 questions must be answered before explicit completion.</li><li>No score, answer markers, clue, source, or rationale appears during the attempt.</li><li>After completion, the full form is reviewable with its original displayed letters.</li></ul>
    <p class="fine">This is a client-side study aid, not a secure proctored exam. The downloaded HTML necessarily contains answer-key data and does not provide anti-cheating secrecy.</p>
    <div class="actions">${inProgress?button('resume-hard80','Resume question '+(attempt.index+1),'primary',!canAct()):button('start-hard80',attempt?'Start another Hard 80 exam':'Start Hard 80 exam','primary',!canAct())}${button('return-study','Return to Study','secondary',busy)}</div>
  </section>`;
}
function hard80QuestionHtml() {
  const view=hard80QuestionView(examState,bank),record=examState.attempt.records[examState.attempt.index],last=view.number===view.total;
  return `<section class="panel question" aria-labelledby="exam-question-title"><div class="question-top"><span>Question ${view.number} of ${view.total}</span><span class="pill">${view.kind==='SATA'?'Select all that apply':'Choose one'}</span></div>
    <progress value="${view.number-1}" max="${view.total}" aria-label="Hard 80 progress"></progress>
    <h1 id="exam-question-title" class="stem" tabindex="-1">${escapeHtml(view.stem)}</h1>
    <fieldset class="answers"><legend class="sr-only">${view.kind==='MC'?'Choose one answer':'Select all correct answers'}</legend>${hard80OptionsHtml(view)}</fieldset>
    <div class="actions">${button(last?'complete-hard80':'next-hard80',last?'Complete exam':'Save answer and continue','primary',!canAct()||!record.selected.length)}${button('return-study','Pause and return to Study','text-button',busy)}</div>
    <p class="fine">Your selection and displayed letters are saved under the isolated Hard 80 namespace. Explanations remain hidden until all 80 are answered and you explicitly complete the exam.</p>
  </section>`;
}
function hard80ReviewList() {
  const records=examState.attempt.records;
  return `<ol class="exam-review-list">${records.map((record,index)=>{const view=hard80QuestionView(examState,bank,index);return `<li><button class="review-button" data-exam-review="${index}">${view.exact?'Correct':'Review'} · Question ${index+1}<span>${escapeHtml(view.stem.slice(0,105))}${view.stem.length>105?'…':''}</span></button></li>`;}).join('')}</ol>`;
}
function hard80SummaryHtml() {
  const summary=hard80Summary(examState,bank);
  return `<section class="panel" aria-labelledby="exam-summary-title"><p class="eyebrow">Hard 80 complete</p><h1 id="exam-summary-title" tabindex="-1">${summary.correct} / ${summary.answered} exact matches · ${summary.percent}%</h1>
    <p class="lede">Scoring uses stable option IDs and exact-match MC/SATA rules. This score is not a readiness prediction or empirical difficulty calibration.</p>
    <div class="actions">${button('start-hard80','Start another Hard 80 exam','primary',!canAct())}${button('return-study','Return to Study','secondary',busy)}</div>
    <h2>Review the completed form</h2>${hard80ReviewList()}</section>`;
}
function hard80ReviewHtml() {
  const view=hard80QuestionView(examState,bank,examReviewIndex);
  return `<section class="panel"><p class="eyebrow">Completed Hard 80 · Question ${view.number} of ${view.total}</p><h1 id="exam-review-title" class="stem" tabindex="-1">${escapeHtml(view.stem)}</h1>
    <div class="answers">${hard80OptionsHtml(view,true)}</div><section class="feedback"><h2 class="${view.exact?'result-correct':'result-incorrect'}">${view.exact?'Correct':'Incorrect · Review this decision'} · Correct answer${view.correctLetters.length>1?'s':''}: ${view.correctLetters.join(', ')}</h2>
    <h3>The key clue</h3><p>${escapeHtml(view.clue)}</p><h3>Clinical reasoning</h3><p>${escapeHtml(view.rationale)}</p>
    ${view.limitations.length?`<details><summary>Case boundaries</summary><ul>${view.limitations.map(text=>`<li>${escapeHtml(text)}</li>`).join('')}</ul></details>`:''}
    <h3>Why each option fits—or doesn’t</h3><div class="reasons">${view.options.map(option=>{const feedback=optionFeedback(option,option.selected,true);return `<div class="${feedback.className}"><h4>${option.letter} · ${feedback.label}</h4><p>${escapeHtml(option.reason)}</p></div>`;}).join('')}</div>
    <details open><summary>Sources</summary><ul class="sources">${view.refs.map(reference=>`<li>${reference.url?`<a href="${escapeHtml(reference.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(reference.label)}</a>`:escapeHtml(reference.label)}</li>`).join('')}</ul></details></section>
    <div class="actions">${button('close-exam-review','Back to completed form','primary')}</div></section>`;
}
function render() {
  const active=state.session&&!state.session.done;
  const total=summarize(state.history,bank);
  const activeWarning=mode==='hard80'?examWarning:warning,activeBlocked=mode==='hard80'?examBlocked:blocked;
  const examAttempt=examState.attempt;
  const examContent=examReviewIndex!==null?hard80ReviewHtml():!examAttempt?hard80SetupHtml():examAttempt.completedAt===null?hard80QuestionHtml():hard80SummaryHtml();
  const studyContent=reviewIndex!==null?historyHtml():showSetup||!state.session?setupHtml():state.session.done?summaryHtml():questionHtml();
  root.innerHTML=`<a class="skip" href="#main">Skip to learning content</a><header class="site-header"><a class="brand" href="./" aria-label="NUR2460 Exam 2 Expanded 445"><img src="icons/favicon.svg" width="38" height="38" alt=""><span>NUR2460 <small>Exam 2 · Expanded</small></span></a></header>
    <main id="main"><nav class="mode-tabs" aria-label="Learning mode">${button('mode-study','Adaptive Study',mode==='study'?'primary':'secondary',busy)}${button('mode-hard80','Hard 80 exam',mode==='hard80'?'primary':'secondary',busy)}</nav>
    <div class="utility"><span>${mode==='study'?`${bank.questions.length} reviewed questions <span class="divider">/</span> ${total.answered} studied`:`${examAttempt?examAttempt.completedAt?'80 answered · complete':`${examAttempt.index} of 80 locked answers`:'No Hard 80 attempt started'}`}</span><div>${mode==='study'&&active?button('change-session','Change session','text-button',!canAct()):''}${button('export','Download progress','text-button')}${button('import','Restore backup','text-button',busy)}</div></div>
    ${activeWarning?`<section id="notice" class="notice ${activeBlocked?'blocked':''}" tabindex="-1" role="status"><p>${escapeHtml(activeWarning)}</p>${activeBlocked?`<div class="actions">${button('reload-save','Load saved version','secondary')}${button('raw-export','Download stored data','secondary')}</div>`:''}</section>`:''}
    ${mode==='hard80'?examContent:studyContent}
    <details class="about"><summary>About this quiz & progress</summary><p>This expanded quiz contains 445 course-aligned questions based primarily on Exam 2 instructor notes, supplied texts, lectures, and bounded current guidance. Review and difficulty work was AI-assisted; difficulty is not empirically calibrated or a nursing-educator certification. It is not official ATI/NCLEX material or clinical advice.</p>
    <p>Adaptive Study supports All weeks and Weeks 4–7, retains immutable session labels for historical review, keeps every selection stage inside the effective week/content pool, and preserves per-track estimates, related-case spacing, exact-match scoring, immediate learning feedback and honest early exhaustion. Hard 80 is separate: it always uses the complete 80-question blueprint, requires all answers, and reveals scoring, clues, sources, keys and all-option rationales only after explicit completion.</p>
    <p>Study and Hard 80 use distinct new save namespaces. Neither mode reads, writes, deletes, imports, converts, or regrades original, checkpoint, Study First or stage-1 Complete progress. Both preserve stable question and option IDs, displayed order, selections and completion state on reload. Invalid or foreign backups are rejected without changing them. Web Locks and compare-before-write protect cooperating tabs; storage failures fall back to memory with an export warning.</p>
    <details><summary>Find older saved progress</summary><p>The main and previously shared study link now open this same 445-question quiz. Progress from that expanded quiz is unchanged. Older backups and saved attempts stay in their original versions; they are not automatically combined.</p><ul><li><a href="earlier/complete/">Earlier 349-question quiz and its progress</a></li><li><a href="earlier/study-checkpoint/">Original 261-question checkpoint and its progress</a></li><li><a href="earlier/">Original 252-question quiz and its progress</a></li></ul></details>
    <p>The client-side standalone HTML necessarily contains answer-key data, so Hard 80 is not a secure proctored exam and makes no anti-cheating secrecy claim. No accounts, analytics, cloud score storage, readiness probability, or mastery certification is provided.</p>
    ${mode==='study'&&state.history.length?reviewList(state.history,0):''}<p class="fine">Expanded 445 · AI-assisted content review; independent nursing-educator review pending. Source-bounded coverage is not a guarantee of every possible exam topic.</p></details>
    <footer>Small sessions or a complete form. Thoughtful decisions. <span>${(mode==='hard80'?examMemoryOnly:memoryOnly)?'In-memory progress—download before closing':'Saved only in this browser'}</span></footer></main><input id="backup-file" type="file" accept="application/json,.json" hidden>`;
  bind();
}
function on(id,event,fn){document.getElementById(id)?.addEventListener(event,fn);}
function bind() {
  on('mode-study','click',()=>{mode='study';examReviewIndex=null;render();focusModeLanding(showSetup||!state.session?'setup-title':state.session.done?'summary-title':'question-title');});
  on('return-study','click',()=>{mode='study';examReviewIndex=null;render();focusModeLanding(showSetup||!state.session?'setup-title':state.session.done?'summary-title':'question-title');});
  on('mode-hard80','click',()=>{mode='hard80';reviewIndex=null;render();focusModeLanding(examState.attempt?examState.attempt.completedAt?'exam-summary-title':'exam-question-title':'exam-setup-title');});
  on('open-hard80','click',()=>{mode='hard80';reviewIndex=null;render();focusModeLanding(examState.attempt&&examState.attempt.completedAt===null?'exam-question-title':'exam-setup-title');});
  on('week','change',e=>{
    const result=reconcileWeekDraft(settings,e.target.value==='All'?'All':Number(e.target.value),bank);settings=result.settings;setupStatus=result.visibleStatus;
    render();document.getElementById('week')?.focus();
  });
  on('topic','change',e=>{const cleared=Boolean(settings.focus);settings.topic=e.target.value;settings.focus='';setupStatus=cleared?'Content area changed. Optional focus was cleared.':'';render();document.getElementById('topic')?.focus();});
  on('focus','change',e=>{settings.focus=e.target.value;if(settings.focus&&settings.topic==='All')settings.topic=trackTopic(bank,settings.focus);setupStatus='';render();document.getElementById('focus')?.focus();});
  on('length','change',e=>{settings.limit=Number(e.target.value);});
  on('start','click',async()=>{
    if(state.session&&!state.session.done&&!confirm('Start a new session? Submitted responses stay in your history. The current question and any unsubmitted selection will be replaced.')){const result=cancelReplacement(state);setupStatus=result.visibleStatus;render();document.getElementById(result.focusId)?.focus();return;}
    showSetup=false;reviewIndex=null;
    try {if(await commit(beginSession(state,settings,bank)))focusAfterCommit(state.session.done?'summary-title':'question-title');}catch(error){showError(error);}
  });
  for(const id of ['change-session','another'])on(id,'click',()=>{showSetup=true;reviewIndex=null;render();document.getElementById('setup-title')?.focus();});
  on('back-session','click',()=>{showSetup=false;render();document.getElementById('question-title')?.focus();});
  root.querySelectorAll('input[name="answer"]').forEach(input=>input.addEventListener('change',async e=>{const id=e.target.id;try{if(await commit(selectOption(state,e.target.value,bank)))focusAfterCommit(id);}catch(error){showError(error);}}));
  root.querySelectorAll('input[name="confidence"]').forEach(input=>input.addEventListener('change',async e=>{const id=e.target.id;try{if(await commit(setConfidence(state,e.target.value)))focusAfterCommit(id);}catch(error){showError(error);}}));
  on('submit','click',async()=>{try{if(await commit(submitAnswer(state,bank)))focusAfterCommit('feedback');}catch(error){showError(error);}});
  on('next','click',async()=>{try{if(await commit(nextQuestion(state,bank)))focusAfterCommit(state.session.done?'summary-title':'question-title');}catch(error){showError(error);}});
  on('start-hard80','click',async()=>{if(examState.attempt&&!confirm('Start a new Hard 80 exam? Download the completed attempt first if you want to keep it.'))return;try{if(await commitExam(beginHard80Exam(examState,bank)))focusAfterCommit('exam-question-title');}catch(error){showError(error);}});
  on('resume-hard80','click',()=>{render();document.getElementById('exam-question-title')?.focus();});
  root.querySelectorAll('input[name="exam-answer"]').forEach(input=>input.addEventListener('change',async e=>{const id=e.target.id;try{if(await commitExam(selectHard80Option(examState,e.target.value,bank)))focusAfterCommit(id);}catch(error){showError(error);}}));
  on('next-hard80','click',async()=>{try{if(await commitExam(nextHard80Question(examState,bank)))focusAfterCommit('exam-question-title');}catch(error){showError(error);}});
  on('complete-hard80','click',async()=>{if(!confirm('Complete the Hard 80 exam now? All selections will lock and the score, correct answers, clues, sources, and rationales will become visible.'))return;try{if(await commitExam(completeHard80Exam(examState,bank)))focusAfterCommit('exam-summary-title');}catch(error){showError(error);}});
  on('export','click',()=>download(JSON.stringify(mode==='hard80'?examState:state,null,2),mode==='hard80'?'NUR2460-expanded445-hard80-progress.json':'NUR2460-expanded445-study-progress.json'));
  on('raw-export','click',()=>{const key=mode==='hard80'?HARD80_SAVE_KEY:SAVE_KEY,raw=mode==='hard80'?examBaseRaw:baseRaw;try{download(localStorage.getItem(key)??raw??'null',mode==='hard80'?'NUR2460-expanded445-hard80-stored-recovery.json':'NUR2460-expanded445-study-stored-recovery.json');}catch{download(raw??'null',mode==='hard80'?'NUR2460-expanded445-hard80-stored-recovery.json':'NUR2460-expanded445-study-stored-recovery.json');}});
  on('reload-save','click',()=>{if(confirm('Load the version currently saved in this browser? Download this tab’s progress first if you want to keep it.'))location.reload();});
  on('import','click',()=>document.getElementById('backup-file').click());
  on('backup-file','change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try {
      if(file.size>8_000_000)throw Error('Backup is too large. Nothing was changed.');
      const raw=JSON.parse(await file.text());
      if(mode==='hard80') {
        const candidate=validateHard80State(raw,bank),answered=candidate.attempt?candidate.attempt.records.filter(record=>record.answered).length:0;
        if(!confirm(`Restore this Hard 80 backup with ${answered} locked answers? This replaces only Exam 2 Expanded 445 Hard 80 progress.`))return;
        if(examBlocked) {try {examBaseRaw=localStorage.getItem(HARD80_SAVE_KEY);}catch {examMemoryOnly=true;}}
        candidate.revision=Math.max(candidate.revision,examState.revision)+1;candidate.token=crypto.randomUUID();
        if(await commitExam(candidate,{restore:true})) {examReviewIndex=null;render();focusAfterCommit(!examState.attempt?'exam-setup-title':examState.attempt.completedAt?'exam-summary-title':'exam-question-title');}
      } else {
        const candidate=validateState(raw,bank);
        if(!confirm(`Restore ${candidate.history.length} submitted responses? This replaces only Exam 2 Expanded 445 Study progress. Earlier-version and Hard 80 progress are not affected.`))return;
        if(blocked) {try {baseRaw=localStorage.getItem(SAVE_KEY);}catch {memoryOnly=true;}}
        candidate.revision=Math.max(candidate.revision,state.revision)+1;candidate.token=crypto.randomUUID();
        if(await commit(candidate,{restore:true})) {if(state.session){const filter=activeProvenance(state).filter;settings={week:filter.week,topic:filter.topic,focus:filter.focus,limit:filter.limit};}else settings={week:'All',topic:'All',focus:'',limit:20};setupStatus='';showSetup=false;reviewIndex=null;render();focusAfterCommit(!state.session?'setup-title':state.session.done?'summary-title':state.session.current.submitted?'feedback':'question-title');}
      }
    }catch(error){showError(error instanceof SyntaxError?Error('This file is not valid JSON. Current progress was not changed.'):error);}
  });
  root.querySelectorAll('[data-review]').forEach(b=>b.addEventListener('click',()=>{reviewIndex=Number(b.dataset.review);render();document.getElementById('review-title')?.focus();}));
  on('close-review','click',()=>{reviewIndex=null;render();document.getElementById(state.session?.done?'summary-title':'question-title')?.focus();});
  root.querySelectorAll('[data-exam-review]').forEach(button=>button.addEventListener('click',()=>{examReviewIndex=Number(button.dataset.examReview);render();document.getElementById('exam-review-title')?.focus();}));
  on('close-exam-review','click',()=>{examReviewIndex=null;render();document.getElementById('exam-summary-title')?.focus();});
}
render();
