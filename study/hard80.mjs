import { findQuestion, score } from './engine.mjs';
import { HARD80_TOTAL, hard80Random, hard80Shuffle, replayHard80Order, selectHard80ForExam } from './hard80-selector.mjs';

export const HARD80_SAVE_KEY = 'nur2460-complete-hard80-2';
export const HARD80_SAVE_SCHEMA = 'nur2460-complete-hard80-save-2';

const hard80Fail = () => {
  throw Error('This is not a valid Hard 80 backup for Exam 2 Complete 1.1.1. Current progress was not replaced, and earlier-version data was not read or changed.');
};
const hard80ExactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).sort().join('|') === [...keys].sort().join('|');

export function blankHard80State(bank) {
  return {
    schema: HARD80_SAVE_SCHEMA,
    bankVersion: bank.version,
    revision: 0,
    token: 'new',
    attempt: null,
  };
}

function touchHard80(state) {
  state.revision += 1;
  state.token = crypto.randomUUID();
  return state;
}

export function findHard80Question(bank, record) {
  return findQuestion(bank, record);
}

export function beginHard80Exam(previous, bank, rng = hard80Random, at = new Date().toISOString()) {
  validateHard80State(previous, bank);
  if (previous.attempt && previous.attempt.completedAt === null) {
    throw Error('Finish or restore the current Hard 80 attempt before starting another.');
  }
  const selection = selectHard80ForExam(bank, { rng });
  const records = selection.questions.map(question => ({
    id: question.id,
    revision: question.revision,
    order: hard80Shuffle(question.options.map(option => option.id), rng),
    selected: [],
    answered: false,
  }));
  const state = structuredClone(previous);
  state.attempt = {
    id: crypto.randomUUID(),
    startedAt: at,
    completedAt: null,
    index: 0,
    records,
  };
  return touchHard80(state);
}

export function selectHard80Option(previous, optionId, bank) {
  const state = structuredClone(previous);
  const attempt = state.attempt;
  if (!attempt || attempt.completedAt !== null) throw Error('This Hard 80 response is locked.');
  const record = attempt.records[attempt.index];
  if (record.answered) throw Error('This Hard 80 response is locked.');
  const question = findHard80Question(bank, record);
  if (!question.options.some(option => option.id === optionId)) throw Error('Unknown Hard 80 option.');
  record.selected = question.kind === 'MC'
    ? [optionId]
    : record.selected.includes(optionId)
      ? record.selected.filter(id => id !== optionId)
      : [...record.selected, optionId];
  return touchHard80(state);
}

export function nextHard80Question(previous, bank) {
  const state = structuredClone(previous);
  const attempt = state.attempt;
  if (!attempt || attempt.completedAt !== null) throw Error('This Hard 80 attempt is locked.');
  const record = attempt.records[attempt.index];
  const question = findHard80Question(bank, record);
  if (!record.selected.length || (question.kind === 'MC' && record.selected.length !== 1)) {
    throw Error('Answer this question before continuing.');
  }
  if (attempt.index === HARD80_TOTAL - 1) {
    throw Error('Use Complete exam after answering question 80.');
  }
  record.answered = true;
  attempt.index += 1;
  return touchHard80(state);
}

export function completeHard80Exam(previous, bank, at = new Date().toISOString()) {
  const state = structuredClone(previous);
  const attempt = state.attempt;
  if (!attempt || attempt.completedAt !== null || attempt.index !== HARD80_TOTAL - 1) {
    throw Error('Hard 80 completion requires reaching question 80.');
  }
  const current = attempt.records[attempt.index];
  const question = findHard80Question(bank, current);
  if (!current.selected.length || (question.kind === 'MC' && current.selected.length !== 1)) {
    throw Error('Answer all 80 questions before completing the exam.');
  }
  current.answered = true;
  if (attempt.records.some(record => !record.answered || !record.selected.length)) {
    throw Error('Answer all 80 questions before completing the exam.');
  }
  attempt.completedAt = at;
  return touchHard80(state);
}

export function hard80Summary(state, bank) {
  const attempt = state.attempt;
  if (!attempt || attempt.completedAt === null) throw Error('Hard 80 scoring is available only after explicit completion.');
  const results = attempt.records.map(record => score(findHard80Question(bank, record), record.selected));
  const correct = results.filter(result => result.exact).length;
  return {
    answered: HARD80_TOTAL,
    correct,
    incorrect: HARD80_TOTAL - correct,
    percent: Math.round(correct / HARD80_TOTAL * 100),
  };
}

export function hard80QuestionView(state, bank, reviewIndex = null) {
  const attempt = state.attempt;
  if (!attempt) throw Error('No Hard 80 attempt is available.');
  const completed = attempt.completedAt !== null;
  const index = completed && reviewIndex !== null ? reviewIndex : attempt.index;
  if (!Number.isSafeInteger(index) || index < 0 || index >= HARD80_TOTAL) throw Error('Unknown Hard 80 review question.');
  if (!completed && index !== attempt.index) throw Error('Only the current question is available during an attempt.');
  const record = attempt.records[index];
  const question = findHard80Question(bank, record);
  const base = {
    number: index + 1,
    total: HARD80_TOTAL,
    completed,
    kind: question.kind,
    stem: question.stem,
    options: record.order.map((id, optionIndex) => {
      const option = question.options.find(candidate => candidate.id === id);
      return {
        id,
        letter: String.fromCharCode(65 + optionIndex),
        text: option.text,
        selected: record.selected.includes(id),
      };
    }),
  };
  if (!completed) return base;
  const result = score(question, record.selected);
  return {
    ...base,
    exact: result.exact,
    correctLetters: record.order.flatMap((id, optionIndex) => (
      question.options.find(option => option.id === id).correct
        ? [String.fromCharCode(65 + optionIndex)]
        : []
    )),
    clue: question.clue,
    rationale: question.rationale,
    limitations: structuredClone(question.limitations ?? []),
    refs: structuredClone(question.refs),
    options: base.options.map(option => {
      const source = question.options.find(candidate => candidate.id === option.id);
      return { ...option, correct: source.correct, reason: source.reason };
    }),
  };
}

export function validateHard80State(raw, bank) {
  if (!hard80ExactKeys(raw, ['schema', 'bankVersion', 'revision', 'token', 'attempt'])
    || raw.schema !== HARD80_SAVE_SCHEMA || raw.bankVersion !== bank.version
    || !Number.isSafeInteger(raw.revision) || raw.revision < 0
    || typeof raw.token !== 'string' || raw.token.length > 100) hard80Fail();
  if (raw.attempt === null) return structuredClone(raw);
  const attempt = raw.attempt;
  if (!hard80ExactKeys(attempt, ['id', 'startedAt', 'completedAt', 'index', 'records'])
    || typeof attempt.id !== 'string' || !attempt.id.length || attempt.id.length > 100
    || typeof attempt.startedAt !== 'string' || !Number.isFinite(Date.parse(attempt.startedAt))
    || !(attempt.completedAt === null || (typeof attempt.completedAt === 'string' && Number.isFinite(Date.parse(attempt.completedAt))))
    || !Number.isSafeInteger(attempt.index) || attempt.index < 0 || attempt.index >= HARD80_TOTAL
    || !Array.isArray(attempt.records) || attempt.records.length !== HARD80_TOTAL) hard80Fail();
  const savedOrder = attempt.records.map(record => ({ id: record?.id, revision: record?.revision }));
  try {
    replayHard80Order(bank, savedOrder);
  } catch {
    hard80Fail();
  }
  for (let index = 0; index < attempt.records.length; index += 1) {
    const record = attempt.records[index];
    if (!hard80ExactKeys(record, ['id', 'revision', 'order', 'selected', 'answered'])) hard80Fail();
    const question = findHard80Question(bank, record);
    const optionIds = question.options.map(option => option.id);
    if (!Array.isArray(record.order) || record.order.length !== optionIds.length
      || new Set(record.order).size !== optionIds.length
      || record.order.some(id => !optionIds.includes(id))
      || !Array.isArray(record.selected) || new Set(record.selected).size !== record.selected.length
      || record.selected.some(id => !optionIds.includes(id))
      || (question.kind === 'MC' && record.selected.length > 1)
      || typeof record.answered !== 'boolean') hard80Fail();
    if (attempt.completedAt !== null) {
      if (!record.answered || !record.selected.length) hard80Fail();
    } else if (index < attempt.index) {
      if (!record.answered || !record.selected.length) hard80Fail();
    } else if (index === attempt.index) {
      if (record.answered) hard80Fail();
    } else if (record.answered || record.selected.length) hard80Fail();
  }
  if (attempt.completedAt !== null && attempt.index !== HARD80_TOTAL - 1) hard80Fail();
  return structuredClone(raw);
}
