import weekMapping from './week-mapping.json' with { type: 'json' };
import { createStudyScopeFields, scopeAllowsQuestion, studyScope, validateStudyScopeFilter } from './blueprint-scope.mjs';

export const CURRENT_WEEK_MAP_VERSION = 'fall-2026-exam2-coverage-private-3';
export const CURRENT_WEEK_MAP_SHA256 = '6a241db16d1d06e79c301748cd0f6744a0caa2fec09449e76a9b6f7f6f3d002a';
export const WEEK_CHOICES = Object.freeze(['All', 4, 5, 6, 7]);
export const TOPIC_TO_WEEK = Object.freeze({ ...weekMapping.topicToWeek });

export class WeekMappingError extends Error {
  constructor(message = 'The required Study week mapping is unavailable or does not match this backup. Nothing was replaced.') {
    super(message);
    this.name = 'WeekMappingError';
    this.code = 'MAPPING_UNAVAILABLE';
  }
}

const weekMapFail = message => { throw new WeekMappingError(message); };

export function validateCurrentWeekMapping(bank) {
  if (!bank || weekMapping.schema !== 'nur2460-week-mapping-2'
    || weekMapping.mappingVersion !== CURRENT_WEEK_MAP_VERSION
    || weekMapping.bankCoverage?.bankVersion !== bank.version
    || weekMapping.bankCoverage?.questionCount !== bank.questions?.length
    || weekMapping.bankCoverage?.bankSha256 !== 'b8da63284f9bc8af08ac3b3520d995cc346926285af6fbb2f1c9ea634414e046'
    || JSON.stringify(weekMapping.validWeeks) !== JSON.stringify(WEEK_CHOICES)
    || Object.keys(bank.topics).some(topic => !Object.hasOwn(TOPIC_TO_WEEK, topic))) {
    weekMapFail('This release does not contain the exact Study week mapping required by its question bank.');
  }
  const counts = Object.fromEntries(WEEK_CHOICES.map(week => [String(week), bank.questions.filter(question => (
    week === 'All' || TOPIC_TO_WEEK[question.topic] === week
  )).length]));
  if (JSON.stringify(counts) !== JSON.stringify(weekMapping.bankCoverage.weekCounts)) {
    weekMapFail('This release week mapping does not match the available question inventory.');
  }
  return weekMapping;
}

export function resolveWeekMap(version, digest, bank) {
  if (version !== CURRENT_WEEK_MAP_VERSION || digest !== CURRENT_WEEK_MAP_SHA256) weekMapFail();
  return validateCurrentWeekMapping(bank);
}

export function weekLabel(week) {
  return week === 'All' ? 'All weeks' : `Week ${week}`;
}

export function allowedTopicsForWeek(week) {
  if (!WEEK_CHOICES.includes(week)) weekMapFail('Choose a valid week.');
  return Object.keys(TOPIC_TO_WEEK).filter(topic => week === 'All' || TOPIC_TO_WEEK[topic] === week);
}

export function trackTopic(bank, track) {
  const topics = [...new Set(bank.questions.filter(question => question.track === track).map(question => question.topic))];
  return topics.length === 1 ? topics[0] : null;
}

export function questionFitsFilter(question, filter, bank) {
  const mapping = resolveWeekMap(filter.weekMapVersion, filter.weekMapArtifactSha256, bank);
  return (filter.week === 'All' || mapping.topicToWeek[question.topic] === filter.week)
    && (filter.topic === 'All' || question.topic === filter.topic)
    && scopeAllowsQuestion(question, validateStudyScopeFilter(filter, bank), bank);
}

export function effectiveQuestions(bank, filter) {
  return bank.questions.filter(question => questionFitsFilter(question, filter, bank));
}

export function createCurrentFilter(settings, bank) {
  const week = settings?.week;
  const requestedTopic = settings?.topic;
  const focus = settings?.focus || '';
  const limit = settings?.limit;
  const scopeFields = createStudyScopeFields(settings, bank);
  if (!WEEK_CHOICES.includes(week)) throw Error('Choose a valid week.');
  if (!(requestedTopic === 'All' || Object.hasOwn(bank.topics, requestedTopic))) throw Error('Choose a valid topic.');
  if (![10, 20, 40].includes(limit)) throw Error('Choose a valid session length.');
  validateCurrentWeekMapping(bank);
  const focusTopic = focus ? trackTopic(bank, focus) : null;
  if (focus && !focusTopic) throw Error('Choose a focus within the selected topic and week.');
  const topic = focus && requestedTopic === 'All' ? focusTopic : requestedTopic;
  if (week !== 'All' && topic !== 'All' && TOPIC_TO_WEEK[topic] !== week) {
    throw Error(`${weekLabel(week)} does not include ${topic}.`);
  }
  if (focus && (topic === 'All' || focusTopic !== topic || (week !== 'All' && TOPIC_TO_WEEK[focusTopic] !== week))) {
    throw Error('Choose a focus within the selected topic and week.');
  }
  if (focus && !bank.questions.some(q => q.track === focus && scopeAllowsQuestion(q, studyScope(settings), bank))) {
    throw Error('Choose a focus inside the selected Study scope.');
  }
  return {
    week,
    topic,
    focus,
    limit,
    weekMapVersion: CURRENT_WEEK_MAP_VERSION,
    weekMapArtifactSha256: CURRENT_WEEK_MAP_SHA256,
    bankVersion: bank.version,
    ...scopeFields,
  };
}

export function reconcileWeekDraft(settings, nextWeek, bank) {
  if (!WEEK_CHOICES.includes(nextWeek)) throw Error('Choose a valid week.');
  const priorTopic = settings.topic;
  const priorFocus = settings.focus;
  const topicInvalid = priorTopic !== 'All' && nextWeek !== 'All' && TOPIC_TO_WEEK[priorTopic] !== nextWeek;
  const topic = topicInvalid ? 'All' : priorTopic;
  const focusTopic = priorFocus ? trackTopic(bank, priorFocus) : '';
  const focusInvalid = Boolean(priorFocus) && (topicInvalid
    || (nextWeek !== 'All' && TOPIC_TO_WEEK[focusTopic] !== nextWeek)
    || (topic !== 'All' && focusTopic !== topic));
  const focus = focusInvalid ? '' : priorFocus;
  let visibleStatus = '';
  if (topicInvalid && focusInvalid) {
    visibleStatus = `Week ${nextWeek} does not include ${priorTopic}. Content area was reset to All content in Week ${nextWeek}, and Optional focus was cleared.`;
  } else if (topicInvalid) {
    visibleStatus = `Week ${nextWeek} does not include ${priorTopic}. Content area was reset to All content in Week ${nextWeek}.`;
  } else if (focusInvalid) {
    visibleStatus = `Week ${nextWeek} does not include the selected focus. Optional focus was cleared.`;
  }
  return {
    settings: { ...settings, week: nextWeek, topic, focus },
    visibleStatus,
    liveRegion: visibleStatus ? 'status' : null,
    focusId: 'week',
  };
}

export function cancelReplacement(activeState) {
  return {
    nextState: activeState,
    shouldCommit: false,
    shouldWriteStorage: false,
    visibleStatus: 'Current session kept. Your current response and submitted history were not changed.',
    liveRegion: 'status',
    focusId: 'start',
  };
}
