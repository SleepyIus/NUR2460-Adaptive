import {
  chooseAdaptiveNext,
  createAdaptiveState,
  describeAdaptiveTrack,
  recordAdaptiveAttempt,
  validateAdaptiveState,
} from './adaptive-selector.mjs';
import { SYNTHETIC_NAMESPACE, createBrowserStudyCatalog } from './catalog-runtime.mjs';
import { summarizeProgress } from './progress-summary.mjs';
import { createStudyPool, validateStudyPool } from './study-filter.mjs';

export const STUDY_STATE_SCHEMA = 'nur2460-c32-catalog242-synthetic-study-state-1';
export const MAX_NEW_BATCH_SIZE = 15;
export const SUBMISSION_KIND = Object.freeze({
  FIRST_ATTEMPT: 'FIRST_ATTEMPT',
  REPEAT: 'REPEAT',
});

export class StudySessionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'StudySessionError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new StudySessionError(code, message);
}

function shuffledOptionIds(question, random) {
  const ids = question.options.map(option => option.id);
  for (let index = ids.length - 1; index > 0; index -= 1) {
    const sample = random();
    if (!Number.isFinite(sample) || sample < 0 || sample >= 1) fail('RANDOM_INVALID', 'Random source must return a number from 0 up to, but not including, 1.');
    const swapIndex = Math.floor(sample * (index + 1));
    [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
  }
  return ids;
}

function exactPermutation(candidate, expected) {
  return Array.isArray(candidate) && candidate.length === expected.length
    && new Set(candidate).size === expected.length
    && candidate.every(optionId => expected.includes(optionId));
}

function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join('|') === [...keys].sort().join('|');
}

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

export function createStudySession({
  catalog = createBrowserStudyCatalog(),
  random = Math.random,
  pool,
  initialState,
} = {}) {
  if (catalog?.namespace !== SYNTHETIC_NAMESPACE || typeof catalog.list !== 'function' || typeof catalog.getQuestion !== 'function') {
    fail('CATALOG_INVALID', 'Study session requires the accepted synthetic catalog.');
  }
  if (typeof random !== 'function') fail('RANDOM_INVALID', 'Random source must be a function.');
  const catalogIdentities = Object.freeze(catalog.list());
  if (catalogIdentities.length !== 242) fail('CATALOG_INVALID', 'Study session requires exactly 242 accepted questions.');
  const catalogById = new Map(catalogIdentities.map(candidate => [candidate.id, candidate]));

  let selectedPool;
  let identities;
  let identity;
  let optionOrder;
  let selected = new Set();
  let submitted = false;
  let submissionKind = null;
  let hintUsed = false;
  let adaptiveState = createAdaptiveState();
  // Exposure is distinct from grading history: merely opening a case makes it seen.
  // Keep logical IDs across every batch/filter; a changed option order is not new.
  let exposure = [];
  let batch = { requestedSize: MAX_NEW_BATCH_SIZE, membership: [] };
  let reviewMode = false;

  function seenIds() { return new Set(exposure.map(entry => entry.id)); }

  function getNewQuestionStatus() {
    const seen = seenIds();
    const unseen = identities.filter(candidate => !seen.has(candidate.id)).length;
    return freeze({ total: identities.length, seen: identities.length - unseen, unseen,
      catalogSeen: seen.size, requestedSize: batch.requestedSize,
      batchSize: batch.membership.length,
      batchRemaining: batch.membership.filter(candidate => !seen.has(candidate.id)).length,
      reviewMode });
  }

  function markSeen(nextIdentity) {
    if (!seenIds().has(nextIdentity.id)) exposure.push({ id: nextIdentity.id, revision: nextIdentity.revision, hinted: false });
  }

  function randomOrder(list) {
    const result = [...list];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const sample = random();
      if (!Number.isFinite(sample) || sample < 0 || sample >= 1) fail('RANDOM_INVALID', 'Random source must return a number from 0 up to, but not including, 1.');
      const swap = Math.floor(sample * (index + 1));
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
  }

  function materializePool(candidate) {
    let validated;
    try {
      validated = validateStudyPool(candidate, catalog);
    } catch (error) {
      fail(error?.code ?? 'POOL_INVALID', error?.message ?? 'Study pool is invalid.');
    }
    const listed = validated.membership.map(member => {
      const descriptor = catalogById.get(member.id);
      if (!descriptor || descriptor.revision !== member.revision) fail('POOL_MEMBERSHIP_INVALID', 'Study pool contains an unaccepted identity or revision.');
      return descriptor;
    });
    return { pool: validated, identities: Object.freeze(listed) };
  }

  function resolveIn(list, id, revision) {
    const match = list.find(candidate => candidate.id === id);
    if (!match) fail('UNKNOWN_ID', 'Question is not in this selected Study pool.');
    if (match.revision !== revision) fail('REVISION_MISMATCH', 'Question revision is not accepted.');
    return match;
  }

  function selectQuestion({ id, revision } = {}, { allowReview = false } = {}) {
    const nextIdentity = resolveIn(identities, id, revision);
    const wasSeen = seenIds().has(id);
    if (wasSeen && !allowReview) fail('REVIEW_REQUIRED', 'This question has already been shown. Choose Review seen questions explicitly to open it again.');
    const question = catalog.getQuestion({ ...nextIdentity, reveal: false });
    const nextOrder = shuffledOptionIds(question, random);
    identity = nextIdentity;
    optionOrder = nextOrder;
    selected = new Set();
    submitted = false;
    submissionKind = null;
    markSeen(nextIdentity);
    hintUsed = exposure.find(entry => entry.id === id).hinted;
    reviewMode = wasSeen;
    return getView();
  }

  function startNewBatch({ size = MAX_NEW_BATCH_SIZE, pool: candidate = selectedPool } = {}) {
    if (!Number.isInteger(size) || size < 1 || size > MAX_NEW_BATCH_SIZE) {
      fail('BATCH_SIZE_INVALID', `Choose a whole-number batch size from 1 through ${MAX_NEW_BATCH_SIZE}.`);
    }
    const next = materializePool(candidate);
    const seen = seenIds();
    const available = next.identities.filter(item => !seen.has(item.id));
    if (!available.length) fail('UNSEEN_POOL_EXHAUSTED', 'No unseen questions remain in these filters. Your current question and history were kept. Broaden the filters or explicitly review seen questions.');
    const membership = randomOrder(available).slice(0, size).map(({id,revision}) => ({id,revision}));
    const nextIdentity = resolveIn(next.identities, membership[0].id, membership[0].revision);
    const question = catalog.getQuestion({ ...nextIdentity, reveal: false });
    const nextOrder = shuffledOptionIds(question, random);
    selectedPool = next.pool;
    identities = next.identities;
    identity = nextIdentity;
    optionOrder = nextOrder;
    selected = new Set();
    submitted = false;
    submissionKind = null;
    hintUsed = false;
    reviewMode = false;
    batch = { requestedSize: size, membership };
    markSeen(nextIdentity);
    return getView();
  }

  function selectPool(candidate) {
    return startNewBatch({ size: batch.requestedSize, pool: candidate });
  }

  function nextUnseenInBatch() {
    const seen = seenIds();
    const next = batch.membership.find(candidate => !seen.has(candidate.id));
    if (!next) fail('BATCH_COMPLETE', 'All questions in this batch have been shown. Start a new batch for remaining unseen questions, change filters, or explicitly review seen questions.');
    return selectQuestion(next);
  }

  function reviewQuestion(candidate) {
    return selectQuestion(candidate, { allowReview: true });
  }

  function reviewPool(candidate = selectedPool) {
    const next = materializePool(candidate);
    const nextIdentity = next.identities.find(item => seenIds().has(item.id));
    if (!nextIdentity) fail('NO_SEEN_QUESTIONS', 'No seen questions are available for review in these filters. Start a new-question batch instead.');
    const question = catalog.getQuestion({ ...nextIdentity, reveal: false });
    const nextOrder = shuffledOptionIds(question, random);
    selectedPool = next.pool;
    identities = next.identities;
    identity = nextIdentity;
    optionOrder = nextOrder;
    selected = new Set();
    submitted = false;
    submissionKind = null;
    hintUsed = exposure.find(entry => entry.id === identity.id).hinted;
    reviewMode = true;
    batch = { requestedSize: batch.requestedSize, membership: [] };
    return getView();
  }

  function revealHint() {
    if (submitted) return getView();
    hintUsed = true;
    exposure.find(entry => entry.id === identity.id).hinted = true;
    return getView();
  }

  function resetHistory() {
    adaptiveState = createAdaptiveState();
    exposure = [];
    return selectPool(selectedPool);
  }

  function toggleOption(optionId) {
    if (submitted) fail('ALREADY_SUBMITTED', 'Choose another question before changing a submitted answer.');
    const question = catalog.getQuestion({ ...identity, reveal: false });
    if (!question.options.some(option => option.id === optionId)) fail('UNKNOWN_OPTION', 'Option is not part of the current question.');
    if (question.kind === 'MC') selected = new Set([optionId]);
    else if (selected.has(optionId)) selected.delete(optionId);
    else selected.add(optionId);
    return getView();
  }

  function submit() {
    if (submitted) return getView();
    const grading = catalog.grade({ ...identity, selectedOptionIds: [...selected] });
    let recorded;
    try {
      recorded = recordAdaptiveAttempt(adaptiveState, {
        identity,
        selectedOptionIds: [...selected],
        correct: grading.correct,
        hinted: hintUsed,
      }, catalog, selectedPool);
    } catch (error) {
      fail(error?.code ?? 'ADAPTIVE_STATE_INVALID', error?.message ?? 'Adaptive response state is invalid.');
    }
    adaptiveState = recorded.state;
    submitted = true;
    submissionKind = recorded.reason === 'REPEAT' ? SUBMISSION_KIND.REPEAT : SUBMISSION_KIND.FIRST_ATTEMPT;
    return getView();
  }

  function getAdaptiveStatus() {
    try {
      const status = describeAdaptiveTrack(adaptiveState, {
        track: identity.track,
        baselineDifficulty: identity.difficulty,
      }, catalog, selectedPool);
      const remainingUnseen = identities.filter(candidate => candidate.track === identity.track && !seenIds().has(candidate.id)).length;
      return freeze({ ...status, remainingUnseen, unseenExhausted: remainingUnseen === 0 });
    } catch (error) {
      fail(error?.code ?? 'ADAPTIVE_STATE_INVALID', error?.message ?? 'Adaptive state is invalid.');
    }
  }

  function selectAdaptiveNext() {
    if (!submitted) fail('ADAPTIVE_REQUIRES_SUBMISSION', 'Submit the current question before requesting another question in this clinical track.');
    let choice;
    try {
      choice = chooseAdaptiveNext(adaptiveState, {
        track: identity.track,
        baselineDifficulty: identity.difficulty,
      }, catalog, selectedPool, [...seenIds()]);
    } catch (error) {
      fail(error?.code ?? 'ADAPTIVE_SELECTION_FAILED', error?.message ?? 'No bounded adaptive selection is available.');
    }
    const view = selectQuestion(choice.identity);
    return freeze({ view, decision: choice.decision });
  }

  function getView() {
    const question = catalog.getQuestion({ ...identity, reveal: submitted || hintUsed });
    const optionsById = new Map(question.options.map(option => [option.id, option]));
    const reviewById = submitted ? new Map(question.answerReview.options.map(option => [option.id, option])) : new Map();
    const options = optionOrder.map(optionId => {
      const option = optionsById.get(optionId);
      const isSelected = selected.has(optionId);
      if (!submitted) return { ...option, selected: isSelected };
      const review = reviewById.get(optionId);
      const state = review.correct
        ? (isSelected ? 'selected-correct' : 'correct-unselected')
        : (isSelected ? 'selected-wrong' : 'wrong-unselected');
      return {
        ...option,
        selected: isSelected,
        correct: review.correct,
        reason: review.reason,
        feedbackState: state,
        feedbackLabel: review.correct
          ? (isSelected ? 'Correct — selected answer' : 'Correct answer — not selected')
          : (isSelected ? 'Incorrect — selected answer' : 'Incorrect answer'),
      };
    });
    const grading = submitted ? catalog.grade({ ...identity, selectedOptionIds: [...selected] }) : null;
    return freeze({
      namespace: SYNTHETIC_NAMESPACE,
      id: question.id,
      revision: question.revision,
      topic: question.topic,
      track: question.track,
      difficulty: question.difficulty,
      kind: question.kind,
      skills: [...question.skills],
      objective: question.objective,
      stem: question.stem,
      options,
      submitted,
      hintUsed,
      correct: grading?.correct ?? null,
      clue: submitted || hintUsed ? question.answerReview.clue : null,
      rationale: submitted ? question.answerReview.rationale : null,
      difficultyReason: submitted ? question.answerReview.difficultyReason : null,
      limitations: submitted ? [...question.answerReview.limitations] : [],
      sourceLinks: submitted ? [...question.sourceLinks] : [],
      sourceWarning: submitted ? question.sourceWarning : null,
      adaptive: getAdaptiveStatus(),
      discovery: getNewQuestionStatus(),
    });
  }

  function exportSyntheticState() {
    return freeze({
      schema: STUDY_STATE_SCHEMA,
      namespace: SYNTHETIC_NAMESPACE,
      pool: {
        schema: selectedPool.schema,
        mappingVersion: selectedPool.mappingVersion,
        mappingSha256: selectedPool.mappingSha256,
        week: selectedPool.week,
        topic: selectedPool.topic,
        membership: selectedPool.membership.map(member => ({ ...member })),
      },
      history: {
        schema: adaptiveState.schema,
        attempts: adaptiveState.attempts.map(attempt => ({ ...attempt, selectedOptionIds: [...attempt.selectedOptionIds] })),
      },
      exposure: exposure.map(entry => ({ ...entry })),
      batch: { requestedSize: batch.requestedSize, membership: batch.membership.map(entry => ({ ...entry })) },
      reviewMode,
      id: identity.id,
      revision: identity.revision,
      optionOrder: [...optionOrder],
      selectedOptionIds: [...selected],
      submitted,
      submissionKind,
      hintUsed,
    });
  }

  function restoreSyntheticState(state) {
    if (!exactKeys(state, ['schema', 'namespace', 'pool', 'history', 'exposure', 'batch', 'reviewMode', 'id', 'revision', 'optionOrder', 'selectedOptionIds', 'submitted', 'submissionKind', 'hintUsed'])) {
      fail('STATE_SHAPE_INVALID', 'Synthetic study state contains missing or unexpected fields.');
    }
    if (state.schema !== STUDY_STATE_SCHEMA || state.namespace !== SYNTHETIC_NAMESPACE) {
      fail('STATE_NAMESPACE_INVALID', 'State does not belong to this private c32 catalog242 synthetic Study namespace.');
    }
    const next = materializePool(state.pool);
    let nextAdaptive;
    try {
      nextAdaptive = validateAdaptiveState(state.history, catalog);
    } catch (error) {
      fail(error?.code ?? 'ADAPTIVE_STATE_INVALID', error?.message ?? 'Saved adaptive state is invalid.');
    }
    const restoredIdentity = resolveIn(next.identities, state.id, state.revision);
    const validateLedger = (entries, list, keys) => {
      if (!Array.isArray(entries) || entries.length > list.length) fail('EXPOSURE_STATE_INVALID', 'Saved exposure or batch ledger is invalid.');
      const unique = new Set();
      for (const entry of entries) {
        if (!exactKeys(entry, keys) || unique.has(entry.id)
          || !list.some(item => item.id === entry.id && item.revision === entry.revision)) fail('EXPOSURE_STATE_INVALID', 'Saved exposure or batch contains an unknown, stale, duplicate, or out-of-pool identity.');
        unique.add(entry.id);
      }
    };
    validateLedger(state.exposure, catalogIdentities, ['id','revision','hinted']);
    if (state.exposure.some(entry => typeof entry.hinted !== 'boolean')
      || !state.exposure.some(entry => entry.id === restoredIdentity.id)
      || nextAdaptive.attempts.some(attempt => !state.exposure.some(entry => entry.id === attempt.id && (!attempt.hinted || entry.hinted)))
      || typeof state.reviewMode !== 'boolean') fail('EXPOSURE_STATE_INVALID', 'Seen-question history must include the current case and all answered cases.');
    if (!exactKeys(state.batch, ['requestedSize','membership']) || !Number.isInteger(state.batch.requestedSize)
      || state.batch.requestedSize < 1 || state.batch.requestedSize > MAX_NEW_BATCH_SIZE) fail('BATCH_STATE_INVALID', `Saved batch size must be from 1 through ${MAX_NEW_BATCH_SIZE}.`);
    validateLedger(state.batch.membership, next.identities, ['id','revision']);
    if (state.batch.membership.length > state.batch.requestedSize) fail('BATCH_STATE_INVALID', 'Saved batch exceeds its requested size.');
    const question = catalog.getQuestion({ ...restoredIdentity, reveal: false });
    const expectedIds = question.options.map(option => option.id);
    if (!exactPermutation(state.optionOrder, expectedIds)) fail('STATE_ORDER_INVALID', 'Saved option order is not an exact option-ID permutation.');
    if (!Array.isArray(state.selectedOptionIds) || new Set(state.selectedOptionIds).size !== state.selectedOptionIds.length
      || !state.selectedOptionIds.every(optionId => expectedIds.includes(optionId))) {
      fail('STATE_SELECTION_INVALID', 'Saved option selection contains an invalid or repeated option ID.');
    }
    if (question.kind === 'MC' && state.selectedOptionIds.length > 1) fail('STATE_SELECTION_INVALID', 'Saved MC state selects more than one option.');
    const validSubmissionKind = Object.values(SUBMISSION_KIND).includes(state.submissionKind);
    if (typeof state.submitted !== 'boolean' || typeof state.hintUsed !== 'boolean'
      || (state.submitted && (state.selectedOptionIds.length === 0 || !validSubmissionKind))
      || (!state.submitted && state.submissionKind !== null)) {
      fail('STATE_INVALID', 'Saved submission or hint state is invalid.');
    }
    if (state.hintUsed !== state.exposure.find(entry => entry.id === state.id).hinted) fail('EXPOSURE_STATE_INVALID', 'Saved clue exposure does not match the current question.');
    if (state.submitted) {
      const matchingAttempts = nextAdaptive.attempts.filter(attempt => attempt.id === restoredIdentity.id && attempt.revision === restoredIdentity.revision);
      if (matchingAttempts.length !== 1) fail('ADAPTIVE_STATE_INVALID', 'Submitted current question must have exactly one matching first-attempt history record.');
      if (state.submissionKind === SUBMISSION_KIND.REPEAT) {
        if (!state.reviewMode) fail('CURRENT_ATTEMPT_STATE_INVALID', 'A submitted repeat must be an explicit seen-question review.');
      } else {
        const [firstAttempt] = matchingAttempts;
        const sameSelectionOrder = firstAttempt.selectedOptionIds.length === state.selectedOptionIds.length
          && firstAttempt.selectedOptionIds.every((optionId, index) => optionId === state.selectedOptionIds[index]);
        const currentGrading = catalog.grade({ ...restoredIdentity, selectedOptionIds: state.selectedOptionIds });
        if (!sameSelectionOrder || firstAttempt.correct !== currentGrading.correct || firstAttempt.hinted !== state.hintUsed) {
          fail('CURRENT_ATTEMPT_STATE_INVALID', 'Submitted first-attempt selection, outcome, and hint status must exactly match its revision-keyed history record.');
        }
      }
    }
    selectedPool = next.pool;
    identities = next.identities;
    adaptiveState = nextAdaptive;
    identity = restoredIdentity;
    optionOrder = [...state.optionOrder];
    selected = new Set(state.selectedOptionIds);
    submitted = state.submitted;
    submissionKind = state.submissionKind;
    hintUsed = state.hintUsed;
    exposure = state.exposure.map(entry => ({ ...entry }));
    batch = { requestedSize: state.batch.requestedSize, membership: state.batch.membership.map(entry => ({ ...entry })) };
    reviewMode = state.reviewMode;
    return getView();
  }

  const session = Object.freeze({
    namespace: SYNTHETIC_NAMESPACE,
    list: () => identities,
    getPool: () => selectedPool,
    getAdaptiveStatus,
    getNewQuestionStatus,
    startNewBatch,
    nextUnseenInBatch,
    reviewQuestion,
    reviewPool,
    getProgress: () => summarizeProgress(adaptiveState, catalog),
    selectPool,
    selectQuestion,
    selectAdaptiveNext,
    resetHistory,
    revealHint,
    toggleOption,
    submit,
    getView,
    exportSyntheticState,
    restoreSyntheticState,
  });

  const initialPool = pool === undefined ? createStudyPool(catalog) : pool;
  const prepared = materializePool(initialPool);
  selectedPool = prepared.pool;
  identities = prepared.identities;
  if (initialState !== undefined) restoreSyntheticState(initialState);
  else startNewBatch();
  return session;
}
