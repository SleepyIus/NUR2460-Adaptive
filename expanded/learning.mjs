import { score } from './engine.mjs';
import { TOPIC_TO_WEEK } from './week-mapping.mjs';
import { scopeAllowsQuestion } from './blueprint-scope.mjs';

// Descriptive study indicators, not calibrated mastery or a pass prediction.
// Derived from the existing validated Study ledger; never persisted or used to grade.
export const LEARNING_RULES = Object.freeze({ minCases: 3, recentCases: 5, reviewGapMs: 86_400_000, retainedCases: 2 });
export const LEARNING_LABELS = Object.freeze({ unassessed: 'Not assessed', practice: 'Needs practice', developing: 'Developing', consistent: 'Consistent on review' });

function learningCaseIndex(bank) {
  const questions = new Map(bank.questions.map(q => [q.id, q]));
  const parents = new Map(bank.questions.map(q => [q.id, q.id]));
  const find = id => { let node = id; while (parents.get(node) !== node) node = parents.get(node); return node; };
  const join = (a, b) => { const left = find(a), right = find(b); if (left !== right) parents.set(right, left); };
  const families = new Map();
  for (const q of bank.questions) {
    const familyKey = JSON.stringify([q.track, q.evidenceFamily]);
    if (families.has(familyKey)) join(q.id, families.get(familyKey)); else families.set(familyKey, q.id);
    for (const id of q.relatedIds ?? []) if (questions.get(id)?.track === q.track) join(q.id, id);
  }
  return { questions, caseId: new Map(bank.questions.map(q => [q.id, find(q.id)])) };
}

function learningRollup(tracks) {
  return {
    total: tracks.length,
    practiced: tracks.filter(t => t.casesSeen > 0).length,
    attention: tracks.filter(t => t.attention).length,
    limited: tracks.filter(t => t.casesSeen > 0 && t.limited).length,
    consistent: tracks.filter(t => t.status === 'consistent').length,
    firstCorrect: tracks.reduce((sum, t) => sum + t.firstCorrect, 0),
    casesSeen: tracks.reduce((sum, t) => sum + t.casesSeen, 0),
    availableCases: tracks.reduce((sum, t) => sum + t.availableCases, 0),
  };
}

export function learningPracticeSettings(bank, track, scope = 'full') {
  const questions = bank.questions.filter(q => q.track === track);
  const topics = [...new Set(questions.map(q => q.topic))];
  if (!Object.hasOwn(bank.tracks, track) || topics.length !== 1 || !TOPIC_TO_WEEK[topics[0]]) throw Error('Choose an available practice focus.');
  const effectiveScope = questions.some(q => scopeAllowsQuestion(q, scope, bank)) ? scope : 'full';
  return { week: TOPIC_TO_WEEK[topics[0]], topic: topics[0], focus: track, limit: 10, scope: effectiveScope };
}

export function summarizeLearning(state, bank) {
  if (!Array.isArray(state?.history)) throw Error('My Learning requires Study history, not an exam attempt.');
  const index = learningCaseIndex(bank);
  const records = new Map();
  state.history.forEach((answer, position) => {
    const question = index.questions.get(answer.id);
    if (!question || question.revision !== answer.revision || !Number.isFinite(Date.parse(answer.at))) throw Error('Study evidence is unavailable. Reload a compatible Study backup.');
    const key = index.caseId.get(question.id);
    const list = records.get(key) ?? [];
    list.push({ question, answer, position, time: Date.parse(answer.at), correct: score(question, answer.selected).exact });
    records.set(key, list);
  });
  const tracks = Object.entries(bank.tracks).flatMap(([id, label]) => {
    const questions = bank.questions.filter(q => q.track === id);
    if (!questions.length) return [];
    const keys = [...new Set(questions.map(q => index.caseId.get(q.id)))];
    const cases = keys.filter(key => records.has(key)).map(key => {
      const entries = records.get(key), first = entries[0], latest = entries.at(-1);
      // The same case may show retention, but never adds independent breadth.
      const delayed = entries.some(e => e.answer.sessionId !== first.answer.sessionId && e.time - first.time >= LEARNING_RULES.reviewGapMs && e.correct);
      return { first, latest, delayed, attempts: entries.length };
    });
    const recent = [...cases].sort((a, b) => b.latest.position - a.latest.position).slice(0, LEARNING_RULES.recentCases);
    const missed = recent.filter(c => !c.latest.correct).length;
    const uncertain = recent.filter(c => c.latest.correct && c.latest.answer.confidence !== 'sure').length;
    const limited = cases.length < LEARNING_RULES.minCases;
    let status = cases.length ? 'developing' : 'unassessed';
    if (!limited && missed >= 2) status = 'practice';
    else if (!limited && !missed && !uncertain && recent.filter(c => c.delayed).length >= LEARNING_RULES.retainedCases) status = 'consistent';
    const firstCorrect = cases.filter(c => c.first.correct).length;
    const latestCorrect = cases.filter(c => c.latest.correct).length;
    const attempts = cases.reduce((sum, c) => sum + c.attempts, 0);
    return [{
      id, label, topic: questions[0].topic, week: TOPIC_TO_WEEK[questions[0].topic], status,
      availableQuestions: questions.length, availableCases: keys.length, casesSeen: cases.length,
      limited, bankLimited: keys.length < LEARNING_RULES.minCases,
      firstCorrect, latestCorrect, recentCorrect: recent.length - missed, recentCount: recent.length,
      missed, uncertain, attention: missed > 0 || uncertain > 0, attempts, reviewAttempts: attempts - cases.length,
      lastAt: recent[0]?.latest.answer.at ?? null,
      trend: latestCorrect > firstCorrect ? 'Improving on seen cases' : latestCorrect < firstCorrect ? 'Recent answers need another check' : 'No change across seen cases',
      reason: !cases.length ? 'Try this focus to establish a starting point.'
        : missed ? `${missed} missed case${missed === 1 ? '' : 's'} among the latest ${recent.length} different case${recent.length === 1 ? '' : 's'}. ${limited ? 'Too little evidence to label this a weakness.' : 'Revisit the decisions behind those answers.'}`
        : uncertain ? 'Correct but unsure or guessed: confirm your understanding on another case.'
        : status === 'consistent' ? 'Correct recent cases and successful later review. This is not a mastery certification.'
        : limited ? 'A correct answer is a start; more different cases are needed.'
        : 'Keep practicing and return on another day to check retention.',
    }];
  });
  const topics = Object.entries(bank.topics).map(([id, topic]) => {
    const items = tracks.filter(t => t.topic === id);
    return { id, label: topic.label, week: TOPIC_TO_WEEK[id], tracks: items, ...learningRollup(items) };
  });
  const weeks = [4, 5, 6, 7].map(week => ({ week, topics: topics.filter(t => t.week === week), ...learningRollup(tracks.filter(t => t.week === week)) }));
  const skills = [...new Set(bank.questions.flatMap(q => q.skills))].sort().map(label => {
    // One first response per case; tags are associations, not a diagnosis of an error.
    const first = [...records.values()].map(entries => entries[0]).filter(e => e.question.skills.includes(label));
    return { label, seen: first.length, correct: first.filter(e => e.correct).length };
  });
  return { ...learningRollup(tracks), tracks, topics, weeks, skills, attempts: state.history.length };
}
