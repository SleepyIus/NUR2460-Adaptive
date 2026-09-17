import {
  CURRENT_WEEK_MAP_SHA256,
  CURRENT_WEEK_MAP_VERSION,
  TOPIC_TO_WEEK,
  WEEK_CHOICES,
  createCurrentFilter,
  questionFitsFilter,
  resolveWeekMap,
  trackTopic,
} from './week-mapping.mjs';

// Isolated successor. It never reads or migrates another version's saves.
export const SAVE_KEY = 'nur2460-exam2-coverage-private-3-study';
export const SAVE_SCHEMA = 'nur2460-exam2-coverage-private-study-save-3';
export const LEVEL_NAMES = { 1: 'Foundational', 2: 'Intermediate', 3: 'Advanced' };
export const CONFIDENCES = ['sure', 'unsure', 'guess'];

export function random() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] / 4294967296;
}

function randomIndex(length) {
  const limit = Math.floor(4294967296 / length) * length;
  const values = new Uint32Array(1);
  do crypto.getRandomValues(values); while (values[0] >= limit);
  return values[0] % length;
}

export function shuffle(values, rng = random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = rng === random ? randomIndex(index + 1) : Math.floor(rng() * (index + 1));
    if (!Number.isInteger(swap) || swap < 0 || swap > index) throw Error('Invalid randomness source.');
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function score(question, selected) {
  const keys = question.options.filter(option => option.correct).map(option => option.id);
  if (!Array.isArray(selected) || new Set(selected).size !== selected.length) {
    return { exact: false, missed: [...keys], extra: [], hits: 0, total: keys.length };
  }
  const missed = keys.filter(id => !selected.includes(id));
  const extra = selected.filter(id => !keys.includes(id));
  return { exact: !missed.length && !extra.length, missed, extra, hits: keys.length - missed.length, total: keys.length };
}

export function findQuestion(bank, record) {
  const question = bank.questions.find(candidate => candidate.id === record.id && candidate.revision === record.revision);
  if (!question) throw Error('This backup contains an unavailable question revision. Nothing was replaced.');
  return question;
}

export function blankState(bank) {
  return {
    schema: SAVE_SCHEMA,
    bankVersion: bank.version,
    revision: 0,
    token: 'new',
    history: [],
    sessionOrder: [],
    sessions: {},
    session: null,
  };
}

function touched(state) {
  state.revision += 1;
  state.token = crypto.randomUUID();
  return state;
}

function family(question) { return `${question.track}|${question.evidenceFamily}`; }

export function activeProvenance(state) {
  if (!state.session) return null;
  const provenance = state.sessions[state.session.id];
  if (!provenance) throw Error('The active Study session provenance is unavailable.');
  return provenance;
}

export function historyContext(state, historyIndex, bank) {
  const record = state.history[historyIndex];
  if (!record) throw Error('That saved response is unavailable.');
  const provenance = state.sessions[record.sessionId];
  if (!provenance) throw Error('The saved response has no originating session.');
  const mapping = resolveWeekMap(provenance.filter.weekMapVersion, provenance.filter.weekMapArtifactSha256, bank);
  const question = findQuestion(bank, record);
  if (!questionFitsFilter(question, provenance.filter, bank)) {
    throw Error('The saved response does not belong to its originating week and content filters.');
  }
  return { record, question, provenance, mapping };
}

// Only first encounters with distinct evidence families in this exact track can
// advance the estimate. Confidence is self-report, not proof of understanding.
export function trackEstimate(state, bank, track) {
  const seen = new Set();
  let level = 2;
  let streak = 0;
  let observations = 0;
  for (const answer of state.history) {
    const question = findQuestion(bank, answer);
    if (question.track !== track || seen.has(family(question))) continue;
    seen.add(family(question));
    observations += 1;
    if (!score(question, answer.selected).exact) {
      level = Math.max(1, level - 1);
      streak = 0;
    } else if (answer.confidence === 'sure' && question.difficulty >= level) {
      if (++streak >= 2) {
        level = Math.min(3, level + 1);
        streak = 0;
      }
    } else {
      streak = 0;
    }
  }
  return { level, observations };
}

export function eligiblePool(state, bank) {
  const provenance = activeProvenance(state);
  if (!provenance) return [];
  const answered = state.history.slice(provenance.start);
  const used = new Set(answered.map(answer => family(findQuestion(bank, answer))));
  const recent = state.history.slice(-3).map(answer => findQuestion(bank, answer));
  return bank.questions.filter(question => questionFitsFilter(question, provenance.filter, bank)
    && !used.has(family(question))
    && !recent.some(previous => previous.track === question.track
      || question.relatedIds.includes(previous.id)
      || previous.relatedIds.includes(question.id)));
}

export function chooseQuestion(state, bank, rng = random) {
  const session = state.session;
  const provenance = activeProvenance(state);
  if (!session || !provenance || state.history.length - provenance.start >= provenance.filter.limit) return null;
  const pool = eligiblePool(state, bank);
  if (!pool.length) return null;
  const seenFamilies = new Set(state.history.map(answer => family(findQuestion(bank, answer))));
  const seenIds = new Set(state.history.map(answer => answer.id));
  const usedTracks = state.history.slice(provenance.start).map(answer => findQuestion(bank, answer).track);
  const lastAnswer = state.history.at(-1);
  const lastQuestion = lastAnswer ? findQuestion(bank, lastAnswer) : null;
  const weakAnswer = [...state.history].reverse().find(answer => !score(findQuestion(bank, answer), answer.selected).exact);
  const weakTrack = weakAnswer ? findQuestion(bank, weakAnswer).track : null;
  const tracks = shuffle([...new Set(pool.map(question => question.track))], rng).map(track => ({
    track,
    weight: (provenance.filter.focus === track ? 1000 : 0)
      + (!provenance.filter.focus && track === weakTrack && track !== lastQuestion?.track ? 5 : 0)
      - usedTracks.filter(candidate => candidate === track).length * 4,
  })).sort((left, right) => right.weight - left.weight);
  const track = tracks[0].track;
  const target = trackEstimate(state, bank, track).level;
  const trackPool = pool.filter(question => question.track === track);
  const distance = Math.min(...trackPool.map(question => Math.abs(question.difficulty - target)));
  const nearest = trackPool.filter(question => Math.abs(question.difficulty - target) === distance);
  const question = shuffle(nearest, rng).map(candidate => ({
    question: candidate,
    weight: (!seenIds.has(candidate.id) ? 16 : 0) + (!seenFamilies.has(family(candidate)) ? 8 : 0),
  })).sort((left, right) => right.weight - left.weight)[0].question;
  const review = seenFamilies.has(family(question));
  let reason = provenance.filter.focus && question.track !== provenance.filter.focus
    ? 'A spaced question inside your selected week and content area before returning to your focus.'
    : `Selected within ${bank.tracks[question.track]}. Difficulty uses this track only.`;
  if (question.difficulty !== target) {
    reason += ` Estimated target: ${LEVEL_NAMES[target]}. No eligible spaced case at that level remains in this track; this is ${LEVEL_NAMES[question.difficulty].toLowerCase()} practice, not evidence of complete difficulty coverage.`;
  }
  if (review) reason += ' This family has been seen before; it will not advance the difficulty estimate.';
  return {
    id: question.id,
    revision: question.revision,
    order: shuffle(question.options.map(option => option.id), rng),
    selected: [],
    confidence: null,
    submitted: false,
    reason,
    review,
  };
}

export function beginSession(previous, settings, bank, rng = random, at = new Date().toISOString()) {
  validateState(previous, bank);
  const filter = createCurrentFilter(settings, bank);
  if (!Number.isFinite(Date.parse(at)) || at.length > 40) throw Error('Choose a valid session start time.');
  const state = structuredClone(previous);
  const id = crypto.randomUUID();
  const provenance = { id, start: state.history.length, startedAt: at, filter };
  state.sessionOrder.push(id);
  state.sessions[id] = provenance;
  state.session = { id, done: false, current: null, endedReason: '' };
  state.session.current = chooseQuestion(state, bank, rng);
  if (!state.session.current) {
    state.session.done = true;
    state.session.endedReason = 'No distinct, spaced cases remain inside these week and content filters. Try a different practice filter before returning.';
  }
  return touched(state);
}

export function selectOption(previous, id, bank) {
  const state = structuredClone(previous);
  const current = state.session?.current;
  if (!current || current.submitted || state.session.done) throw Error('This response is locked.');
  const question = findQuestion(bank, current);
  if (!question.options.some(option => option.id === id)) throw Error('Unknown option.');
  current.selected = question.kind === 'MC'
    ? [id]
    : current.selected.includes(id)
      ? current.selected.filter(candidate => candidate !== id)
      : [...current.selected, id];
  return touched(state);
}

export function setConfidence(previous, confidence) {
  const state = structuredClone(previous);
  const current = state.session?.current;
  if (!current || current.submitted || state.session.done || !CONFIDENCES.includes(confidence)) throw Error('This response is locked.');
  current.confidence = confidence;
  return touched(state);
}

export function submitAnswer(previous, bank, at = new Date().toISOString()) {
  const state = structuredClone(previous);
  const current = state.session?.current;
  if (!current || current.submitted || state.session.done) throw Error('This response is already locked.');
  if (!current.selected.length || !current.confidence) throw Error('Choose an answer and your confidence before submitting.');
  const question = findQuestion(bank, current);
  if (question.kind === 'MC' && current.selected.length !== 1) throw Error('Choose one answer.');
  if (!Number.isFinite(Date.parse(at)) || at.length > 40) throw Error('The response time is invalid.');
  state.history.push({
    id: current.id,
    revision: current.revision,
    order: [...current.order],
    selected: [...current.selected],
    confidence: current.confidence,
    at,
    sessionId: state.session.id,
  });
  current.submitted = true;
  return touched(state);
}

export function nextQuestion(previous, bank, rng = random) {
  const state = structuredClone(previous);
  const session = state.session;
  if (!session || session.done || !session.current?.submitted) throw Error('Submit this response first.');
  session.current = chooseQuestion(state, bank, rng);
  if (!session.current) {
    const provenance = activeProvenance(state);
    session.done = true;
    session.endedReason = state.history.length - provenance.start >= provenance.filter.limit
      ? 'Your planned session is complete.'
      : 'You reached the available distinct, spaced cases inside these week and content filters. No duplicates or off-week questions were added.';
  }
  return touched(state);
}

export class StudyStateError extends Error {
  constructor(code = 'INVALID_STUDY_SAVE') {
    super('This is not a valid Study backup for Exam 2 Expanded 445. Your current progress was not replaced. Original, checkpoint, Study First, stage-1 Complete, and Hard 80 backups stay with their own versions.');
    this.name = 'StudyStateError';
    this.code = code;
  }
}

const studyFail = code => { throw new StudyStateError(code); };
const sessionIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/u;
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).sort().join('|') === [...keys].sort().join('|');
const canonical = value => JSON.stringify(value);

function validIds(ids, allowed, { full = false } = {}) {
  return Array.isArray(ids) && ids.every(id => typeof id === 'string' && allowed.includes(id))
    && new Set(ids).size === ids.length && (!full || ids.length === allowed.length);
}

function validateQuestionState(record, submitted, bank) {
  const question = findQuestion(bank, record);
  const ids = question.options.map(option => option.id);
  if (!validIds(record.order, ids, { full: true }) || !validIds(record.selected, ids)
    || (question.kind === 'MC' && record.selected.length > 1)
    || (submitted && (!record.selected.length || !CONFIDENCES.includes(record.confidence)))
    || (!submitted && record.confidence !== null && !CONFIDENCES.includes(record.confidence))) studyFail('QUESTION_STATE_INVALID');
  return question;
}

function validateFilter(filter, bank) {
  if (!exactKeys(filter, ['week', 'topic', 'focus', 'limit', 'weekMapVersion', 'weekMapArtifactSha256', 'bankVersion'])
    || !WEEK_CHOICES.includes(filter.week) || !(filter.topic === 'All' || Object.hasOwn(bank.topics, filter.topic))
    || typeof filter.focus !== 'string' || filter.focus.length > 200 || ![10, 20, 40].includes(filter.limit)
    || filter.bankVersion !== bank.version) studyFail('SESSION_FILTER_INVALID');
  const mapping = resolveWeekMap(filter.weekMapVersion, filter.weekMapArtifactSha256, bank);
  if (filter.topic !== 'All' && filter.week !== 'All' && mapping.topicToWeek[filter.topic] !== filter.week) studyFail('FILTER_INCOMPATIBLE');
  if (filter.focus) {
    const focusTopic = trackTopic(bank, filter.focus);
    if (!focusTopic || filter.topic === 'All' || focusTopic !== filter.topic
      || (filter.week !== 'All' && mapping.topicToWeek[focusTopic] !== filter.week)) studyFail('FOCUS_INCOMPATIBLE');
  }
  return mapping;
}

export function validateState(raw, bank) {
  if (!exactKeys(raw, ['schema', 'bankVersion', 'revision', 'token', 'history', 'sessionOrder', 'sessions', 'session'])
    || raw.schema !== SAVE_SCHEMA || raw.bankVersion !== bank.version || !Number.isSafeInteger(raw.revision) || raw.revision < 0
    || typeof raw.token !== 'string' || raw.token.length > 100 || !Array.isArray(raw.history) || raw.history.length > 10000
    || !Array.isArray(raw.sessionOrder) || raw.sessionOrder.length > 10000 || new Set(raw.sessionOrder).size !== raw.sessionOrder.length
    || !raw.sessions || typeof raw.sessions !== 'object' || Array.isArray(raw.sessions) || Object.keys(raw.sessions).length > 10000) {
    studyFail('SAVE_SHAPE_INVALID');
  }
  const sessionKeys = Object.keys(raw.sessions);
  if (sessionKeys.length !== raw.sessionOrder.length
    || raw.sessionOrder.some(id => !sessionIdPattern.test(id) || !Object.hasOwn(raw.sessions, id))) studyFail('SESSION_LEDGER_BIJECTION');

  let priorStart = -1;
  for (const [index, id] of raw.sessionOrder.entries()) {
    const provenance = raw.sessions[id];
    if (!exactKeys(provenance, ['id', 'start', 'startedAt', 'filter']) || provenance.id !== id
      || !Number.isSafeInteger(provenance.start) || provenance.start < 0 || provenance.start > raw.history.length
      || provenance.start < priorStart || (index === 0 && provenance.start !== 0)
      || typeof provenance.startedAt !== 'string' || provenance.startedAt.length > 40 || !Number.isFinite(Date.parse(provenance.startedAt))) {
      studyFail('SESSION_PROVENANCE_INVALID');
    }
    validateFilter(provenance.filter, bank);
    priorStart = provenance.start;
  }

  const questions = [];
  for (const record of raw.history) {
    if (!exactKeys(record, ['id', 'revision', 'order', 'selected', 'confidence', 'at', 'sessionId'])
      || typeof record.sessionId !== 'string' || !sessionIdPattern.test(record.sessionId)
      || typeof record.at !== 'string' || record.at.length > 40 || !Number.isFinite(Date.parse(record.at))) studyFail('HISTORY_RECORD_INVALID');
    const origin = raw.sessions[record.sessionId];
    if (!origin) studyFail('UNKNOWN_ORIGINATING_SESSION');
    const question = validateQuestionState(record, true, bank);
    if (!questionFitsFilter(question, origin.filter, bank)) studyFail('ORIGINATING_SESSION_FILTER_MISMATCH');
    const recent = questions.slice(-3);
    if (recent.some(previous => previous.track === question.track || question.relatedIds.includes(previous.id)
      || previous.relatedIds.includes(question.id))) studyFail('RELATED_SPACING_INVALID');
    questions.push(question);
  }

  for (let index = 0; index < raw.sessionOrder.length; index += 1) {
    const id = raw.sessionOrder[index];
    const provenance = raw.sessions[id];
    const end = index + 1 < raw.sessionOrder.length ? raw.sessions[raw.sessionOrder[index + 1]].start : raw.history.length;
    if (end < provenance.start) studyFail('SESSION_BOUNDARY_INVALID');
    const records = raw.history.slice(provenance.start, end);
    if (records.some(record => record.sessionId !== id) || records.length > provenance.filter.limit) studyFail('SESSION_BOUNDARY_INVALID');
    const families = records.map(record => family(findQuestion(bank, record)));
    if (new Set(families).size !== families.length) studyFail('SESSION_FAMILY_REUSED');
  }

  if (raw.session === null) {
    if (raw.history.length || raw.sessionOrder.length || sessionKeys.length) studyFail('NONBLANK_SAVE_WITHOUT_CURRENT_SESSION');
    return structuredClone(raw);
  }
  const session = raw.session;
  if (!exactKeys(session, ['id', 'done', 'current', 'endedReason']) || session.id !== raw.sessionOrder.at(-1)
    || typeof session.done !== 'boolean' || typeof session.endedReason !== 'string' || session.endedReason.length > 300) {
    studyFail('CURRENT_SESSION_INVALID');
  }
  const provenance = raw.sessions[session.id];
  validateFilter(provenance.filter, bank);
  if (raw.history.slice(provenance.start).some(record => record.sessionId !== session.id)
    || raw.history.slice(0, provenance.start).some(record => record.sessionId === session.id)) studyFail('ACTIVE_SESSION_BOUNDARY_INVALID');
  if (session.done) {
    if (session.current !== null) studyFail('DONE_SESSION_HAS_CURRENT');
  } else {
    const current = session.current;
    if (!exactKeys(current, ['id', 'revision', 'order', 'selected', 'confidence', 'submitted', 'reason', 'review'])
      || typeof current.submitted !== 'boolean' || typeof current.review !== 'boolean'
      || typeof current.reason !== 'string' || current.reason.length > 1200) studyFail('CURRENT_QUESTION_INVALID');
    const question = validateQuestionState(current, current.submitted, bank);
    if (!questionFitsFilter(question, provenance.filter, bank)) studyFail('ACTIVE_SESSION_FILTER_MISMATCH');
    const activeRecords = raw.history.slice(provenance.start);
    if (current.submitted) {
      const last = activeRecords.at(-1);
      if (!last || ['id', 'revision', 'order', 'selected', 'confidence']
        .some(key => canonical(last[key]) !== canonical(current[key]))) studyFail('SUBMITTED_CURRENT_MISMATCH');
    } else {
      if (activeRecords.length >= provenance.filter.limit
        || activeRecords.some(record => family(findQuestion(bank, record)) === family(question))) studyFail('CURRENT_QUESTION_INELIGIBLE');
      const recent = questions.slice(-3);
      if (recent.some(previous => previous.track === question.track || question.relatedIds.includes(previous.id)
        || previous.relatedIds.includes(question.id))) studyFail('CURRENT_RELATED_SPACING_INVALID');
    }
  }
  return structuredClone(raw);
}

export function assertImmutableLedger(previous, next) {
  if (next.sessionOrder.length < previous.sessionOrder.length || next.sessionOrder.length > previous.sessionOrder.length + 1
    || canonical(next.sessionOrder.slice(0, previous.sessionOrder.length)) !== canonical(previous.sessionOrder)) {
    studyFail('IMMUTABLE_SESSION_ORDER_CHANGED');
  }
  for (const id of previous.sessionOrder) {
    if (canonical(next.sessions[id]) !== canonical(previous.sessions[id])) studyFail('IMMUTABLE_SESSION_PROVENANCE_CHANGED');
  }
  if (next.sessionOrder.length === previous.sessionOrder.length + 1) {
    const added = next.sessionOrder.at(-1);
    if (next.sessions[added]?.start !== previous.history.length) studyFail('NEW_SESSION_BOUNDARY_INVALID');
  }
  return true;
}

export function summarize(records, bank) {
  const correct = records.filter(answer => score(findQuestion(bank, answer), answer.selected).exact).length;
  return { answered: records.length, correct, percent: records.length ? Math.round(correct / records.length * 100) : null };
}

export const STUDY_WEEK_CONTRACT = Object.freeze({
  saveKey: SAVE_KEY,
  saveSchema: SAVE_SCHEMA,
  weekMapVersion: CURRENT_WEEK_MAP_VERSION,
  weekMapArtifactSha256: CURRENT_WEEK_MAP_SHA256,
  topicToWeek: TOPIC_TO_WEEK,
});
