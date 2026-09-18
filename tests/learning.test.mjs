import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { summarizeLearning, learningPracticeSettings } from '../expanded/learning.mjs';
import { learningDashboardHtml } from '../expanded/learning-view.mjs';
import { blankState, beginSession, selectOption, setConfidence, submitAnswer, validateState } from '../expanded/engine.mjs';
import { blankHard80State, beginHard80Exam } from '../expanded/hard80.mjs';
import { createCurrentFilter } from '../expanded/week-mapping.mjs';

const realBank = JSON.parse(fs.readFileSync(new URL('../expanded/bank.json', import.meta.url)));
function fixture(count = 3) {
  return { tracks: { focus: 'A learning focus' }, topics: { Pregnancy: { label: 'Pregnancy' } }, questions: Array.from({ length: count }, (_, i) => ({
    id: `q${i}`, revision: 1, track: 'focus', topic: 'Pregnancy', evidenceFamily: `case-${i}`, relatedIds: [], kind: 'MC',
    difficulty: 2, skills: ['Priority', 'Assessment'], options: [{ id: 'right', correct: true }, { id: 'wrong', correct: false }],
  })) };
}
function answer(id, correct = true, day = 0, sessionId = `s${day}`, confidence = 'sure') {
  return { id: `q${id}`, revision: 1, selected: [correct ? 'right' : 'wrong'], confidence, sessionId, at: new Date(Date.UTC(2026, 8, 1 + day, 12)).toISOString() };
}
const focus = (history, bank = fixture()) => summarizeLearning({ history }, bank).tracks[0];

test('empty history is unassessed, not zero mastery or a weakness', () => {
  const m = summarizeLearning(blankState(realBank), realBank);
  assert.equal(m.total, 286); assert.equal(m.practiced, 0); assert.equal(m.attention, 0); assert.equal(m.consistent, 0);
  assert(m.tracks.every(t => t.status === 'unassessed' && t.lastAt === null));
  assert.equal(m.weeks.reduce((sum, w) => sum + w.total, 0), m.total);
});
test('one correct case stays developing with limited evidence', () => {
  const t = focus([answer(0)], fixture(1));
  assert.equal(t.status, 'developing'); assert(t.limited); assert(t.bankLimited); assert.equal(t.firstCorrect, 1);
});
test('one miss prompts a review without diagnosing a weakness', () => {
  const t = focus([answer(0, false)]);
  assert.equal(t.status, 'developing'); assert(t.attention); assert(t.limited); assert.match(t.reason, /Too little evidence/);
});
test('repeating one case never adds breadth or raises first-attempt accuracy', () => {
  const t = focus([answer(0, false), ...Array.from({ length: 20 }, (_, i) => answer(0, true, i + 1))]);
  assert.equal(t.casesSeen, 1); assert.equal(t.firstCorrect, 0); assert.equal(t.latestCorrect, 1); assert.equal(t.reviewAttempts, 20);
  assert.equal(t.status, 'developing'); assert(t.limited); assert.match(t.trend, /Improving/);
});
test('related variants and matching evidence families form one case group', () => {
  const b = fixture(); b.questions[0].relatedIds = ['q1']; b.questions[1].evidenceFamily = b.questions[2].evidenceFamily;
  const t = focus([answer(0), answer(1), answer(2)], b);
  assert.equal(t.availableCases, 1); assert.equal(t.casesSeen, 1); assert.equal(t.reviewAttempts, 2); assert(t.bankLimited);
});
test('three distinct cases and repeated misses support Needs practice', () => {
  assert.equal(focus([answer(0, false), answer(1, false)]).status, 'developing');
  assert.equal(focus([answer(0, false), answer(1, false), answer(2)]).status, 'practice');
});
test('correct distinct cases in one sitting do not establish retention', () => {
  const t = focus([answer(0), answer(1), answer(2)]);
  assert.equal(t.status, 'developing'); assert(!t.limited); assert(!t.attention);
});
test('Consistent on review requires two delayed case reviews in different sessions', () => {
  const start = [answer(0), answer(1), answer(2)];
  assert.equal(focus([...start, answer(0, true, 1)]).status, 'developing');
  assert.equal(focus([...start, answer(0, true, 1), answer(1, true, 1)]).status, 'consistent');
  assert.equal(focus([...start, answer(0, true, 1, 's0'), answer(1, true, 1, 's0')]).status, 'developing');
});
test('changing sessions without 24 hours of spacing cannot earn retention', () => {
  const t = focus([answer(0), answer(1), answer(2), answer(0, true, 0, 'other'), answer(1, true, 0, 'other')]);
  assert.equal(t.status, 'developing');
});
test('a correct guess or unsure answer needs confirmation without changing its score', () => {
  for (const confidence of ['guess', 'unsure']) {
    const t = focus([answer(0), answer(1), answer(2), answer(0, true, 2), answer(1, true, 2, 's2', confidence)]);
    assert.equal(t.status, 'developing'); assert(t.attention); assert.equal(t.firstCorrect, 3); assert.equal(t.recentCorrect, 3);
  }
});
test('recent misses remove consistency while initial accuracy remains intact', () => {
  const h = [answer(0), answer(1), answer(2), answer(0, true, 1), answer(1, true, 1)];
  const t = focus([...h, answer(0, false, 2), answer(1, false, 2)]);
  assert.equal(t.status, 'practice'); assert.equal(t.firstCorrect, 3); assert.equal(t.latestCorrect, 1);
});
test('latest evidence uses at most five different groups, never five duplicate attempts', () => {
  const h = [answer(0, false), answer(1, false), answer(2), ...Array.from({ length: 10 }, (_, i) => answer(2, true, i + 1))];
  const t = focus(h);
  assert.equal(t.recentCount, 3); assert.equal(t.missed, 2); assert.equal(t.status, 'practice');
});
test('SATA remains exact-match and selection letters have no effect', () => {
  const b = fixture(1); b.questions[0].kind = 'SATA'; b.questions[0].options.push({ id: 'right2', correct: true });
  const h = [{ ...answer(0), selected: ['right'] }, { ...answer(0, true, 1), order: ['wrong', 'right2', 'right'], selected: ['right2', 'right'] }];
  const t = focus(h, b);
  assert.equal(t.firstCorrect, 0); assert.equal(t.latestCorrect, 1); assert.equal(t.casesSeen, 1);
  assert.equal(focus([{ ...answer(0), selected: ['right', 'right2', 'wrong'] }], b).firstCorrect, 0);
});
test('weeks and areas follow the existing course map, not the session All-weeks filter', () => {
  const h = realBank.questions.slice(0, 349).map((q, i) => ({ ...answer(0), id: q.id, revision: q.revision, selected: q.options.filter(o => o.correct).map(o => o.id), sessionId: `sample-${i}` }));
  const m = summarizeLearning({ history: h }, realBank);
  assert.equal(m.weeks.length, 4); assert.equal(m.topics.length, 7);
  assert.deepEqual(m.weeks.map(w => w.topics.map(t => t.id)), [['Pregnancy'], ['Labor', 'Newborn'], ['GYN', 'Growth'], ['Skin', 'GI']]);
  assert.equal(m.weeks.reduce((sum, w) => sum + w.practiced, 0), m.practiced);
});
test('skill patterns use one first response per group and disclose overlapping tags', () => {
  const m = summarizeLearning({ history: [answer(0, false), answer(0, true, 1), answer(1)] }, fixture());
  assert(m.skills.every(s => s.seen === 2 && s.correct === 1));
  const html = learningDashboardHtml(m);
  assert.match(html, /do not establish why an answer was missed/);
});
test('dashboard calculations are read-only and do not inspect unfinished questions', () => {
  const state = { history: [answer(0)], session: { current: { id: 'q1', selected: ['wrong'], submitted: false } } }, bank = fixture();
  const before = JSON.stringify({ state, bank });
  assert.equal(summarizeLearning(state, bank).casesSeen, 1);
  assert.equal(JSON.stringify({ state, bank }), before);
});
test('unknown revisions and Hard80-shaped state are not silently regraded', () => {
  assert.throws(() => focus([{ ...answer(0), revision: 2 }]), /unavailable/);
  assert.throws(() => summarizeLearning(beginHard80Exam(blankHard80State(realBank), realBank), realBank), /Study history/);
});
test('all Practice buttons select valid existing week, area and focus settings', () => {
  for (const track of Object.keys(realBank.tracks)) {
    const settings = learningPracticeSettings(realBank, track);
    assert.equal(settings.focus, track); assert.equal(settings.limit, 10);
    assert.deepEqual(createCurrentFilter(settings, realBank).focus, track);
  }
  assert.throws(() => learningPracticeSettings(realBank, 'unknown'), /available/);
});
test('an existing valid Study save works unchanged and computes immediately after submission', () => {
  let s = beginSession(blankState(realBank), { week: 4, topic: 'Pregnancy', focus: '', limit: 10 }, realBank, () => 0.3);
  const q = realBank.questions.find(q => q.id === s.session.current.id);
  for (const option of q.options.filter(o => o.correct)) s = selectOption(s, option.id, realBank);
  s = setConfidence(s, 'sure'); s = submitAnswer(s, realBank);
  const bytes = JSON.stringify(s); const restored = validateState(JSON.parse(bytes), realBank);
  const model = summarizeLearning(restored, realBank);
  assert.equal(model.practiced, 1); assert.equal(model.firstCorrect, 1); assert.equal(JSON.stringify(restored), bytes);
});
test('empty, filtered and limited-evidence views have honest labels and no answer material', () => {
  const m = summarizeLearning({ history: [] }, fixture(1));
  const html = learningDashboardHtml(m);
  assert.match(html, /Untouched topics are not weaknesses/); assert.match(html, /Limited evidence/);
  assert.match(html, /Hard 80 stays separate/); assert(!html.includes('0% mastered'));
  assert(!html.includes('Correct answer:')); assert(!html.includes('right2'));
  assert.match(learningDashboardHtml(m, { filter: 'consistent' }), /No focuses match/);
  assert.match(learningDashboardHtml(m, { disabled: true }), /data-learning-practice="focus" disabled/);
});
test('untrusted labels are escaped and week filters keep other areas out of the detail list', () => {
  const b = fixture(1); b.tracks.focus = '<img src=x onerror=alert(1)>';
  const html = learningDashboardHtml(summarizeLearning({ history: [] }, b));
  assert(!html.includes('<img')); assert(html.includes('&lt;img'));
  const actual = learningDashboardHtml(summarizeLearning(blankState(realBank), realBank), { week: 7 });
  assert(actual.includes('id="learning-week-7"')); assert(!actual.includes('id="learning-week-4"'));
});
