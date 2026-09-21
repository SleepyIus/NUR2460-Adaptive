export const ADAPTIVE_STATE_SCHEMA = 'nur2460-c32-catalog242-revision-history-1';
export const ADAPTIVE_POLICY = Object.freeze({
  basis: 'first attempt on each distinct accepted question revision across filter switches',
  hintedResponsesCount: false,
  repeatedResponsesCount: false,
  adjustment: 'one accepted difficulty level up after correct evidence and down after incorrect evidence',
  calibration: 'transparent conservative estimate; not psychometric calibration, mastery certification, or pass prediction',
});

export class AdaptiveSelectionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AdaptiveSelectionError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new AdaptiveSelectionError(code, message);
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

function acceptedCatalog(catalog) {
  if (!catalog || typeof catalog.list !== 'function' || typeof catalog.grade !== 'function') {
    fail('ADAPTIVE_CONTEXT_INVALID', 'Revision history requires the accepted Study catalog.');
  }
  const identities = catalog.list();
  if (identities.length !== 242) fail('ADAPTIVE_CONTEXT_INVALID', 'Revision history requires the exact catalog242 catalog.');
  const byId = new Map(identities.map(identity => [identity.id, identity]));
  const levels = [...new Set(identities.map(identity => identity.difficulty))].sort((a, b) => a - b);
  if (!levels.length || levels.some(level => !Number.isInteger(level))) fail('ADAPTIVE_CONTEXT_INVALID', 'Accepted difficulty levels are invalid.');
  return { identities, byId, levels };
}

function selectedPool(catalog, pool) {
  if (!pool || !Array.isArray(pool.membership) || pool.membership.length === 0) {
    fail('ADAPTIVE_POOL_INVALID', 'Bounded selection requires an explicit nonempty Study pool.');
  }
  const context = acceptedCatalog(catalog);
  const identities = pool.membership.map(member => {
    const identity = context.byId.get(member.id);
    if (!identity || identity.revision !== member.revision) fail('ADAPTIVE_POOL_INVALID', 'Study pool contains an unaccepted identity or revision.');
    return identity;
  });
  return { ...context, poolIdentities: identities };
}

function clampToAcceptedLevel(requested, levels) {
  if (requested <= levels[0]) return levels[0];
  if (requested >= levels.at(-1)) return levels.at(-1);
  if (levels.includes(requested)) return requested;
  return levels.reduce((best, level) => Math.abs(level - requested) < Math.abs(best - requested) ? level : best, levels[0]);
}

export function createAdaptiveState() {
  return freeze({ schema: ADAPTIVE_STATE_SCHEMA, attempts: [] });
}

export function validateAdaptiveState(state, catalog) {
  if (!exactKeys(state, ['schema', 'attempts']) || state.schema !== ADAPTIVE_STATE_SCHEMA || !Array.isArray(state.attempts)) {
    fail('ADAPTIVE_STATE_INVALID', 'Saved revision history does not match the c32 catalog242 schema.');
  }
  const { byId } = acceptedCatalog(catalog);
  const seen = new Set();
  const attempts = state.attempts.map(attempt => {
    if (!exactKeys(attempt, ['id', 'revision', 'track', 'topic', 'difficulty', 'selectedOptionIds', 'correct', 'hinted'])) {
      fail('ADAPTIVE_STATE_INVALID', 'Saved first-attempt record contains missing or unexpected fields.');
    }
    const identity = byId.get(attempt.id);
    const key = `${attempt.id}@${attempt.revision}`;
    if (!identity || identity.revision !== attempt.revision || seen.has(key)
      || attempt.track !== identity.track || attempt.topic !== identity.topic || attempt.difficulty !== identity.difficulty
      || !Array.isArray(attempt.selectedOptionIds) || new Set(attempt.selectedOptionIds).size !== attempt.selectedOptionIds.length
      || typeof attempt.correct !== 'boolean' || typeof attempt.hinted !== 'boolean') {
      fail('ADAPTIVE_STATE_INVALID', 'Saved first-attempt record is stale, repeated, or inconsistent with accepted metadata.');
    }
    let grading;
    try {
      grading = catalog.grade({ id: attempt.id, revision: attempt.revision, selectedOptionIds: attempt.selectedOptionIds });
    } catch {
      fail('ADAPTIVE_STATE_INVALID', 'Saved first-attempt record contains an invalid option selection.');
    }
    if (grading.correct !== attempt.correct) fail('ADAPTIVE_STATE_INVALID', 'Saved first-attempt outcome does not match exact option-ID grading.');
    seen.add(key);
    return { ...attempt, selectedOptionIds: [...attempt.selectedOptionIds] };
  });
  return freeze({ schema: ADAPTIVE_STATE_SCHEMA, attempts });
}

export function recordAdaptiveAttempt(state, { identity, selectedOptionIds, correct, hinted }, catalog, pool) {
  const validated = validateAdaptiveState(state, catalog);
  const context = selectedPool(catalog, pool);
  const accepted = context.byId.get(identity?.id);
  const key = `${identity?.id}@${identity?.revision}`;
  if (!accepted || accepted.revision !== identity.revision
    || !context.poolIdentities.some(candidate => `${candidate.id}@${candidate.revision}` === key)
    || !Array.isArray(selectedOptionIds) || typeof correct !== 'boolean' || typeof hinted !== 'boolean') {
    fail('ADAPTIVE_ATTEMPT_INVALID', 'First attempt must reference the exact current accepted question in the selected pool.');
  }
  let grading;
  try {
    grading = catalog.grade({ id: accepted.id, revision: accepted.revision, selectedOptionIds });
  } catch {
    fail('ADAPTIVE_ATTEMPT_INVALID', 'First attempt contains an invalid exact option-ID selection.');
  }
  if (grading.correct !== correct) fail('ADAPTIVE_ATTEMPT_INVALID', 'First-attempt outcome does not match exact option-ID grading.');
  if (validated.attempts.some(attempt => attempt.id === accepted.id && attempt.revision === accepted.revision)) {
    return freeze({ state: validated, counted: false, reason: 'REPEAT' });
  }
  const next = freeze({
    schema: ADAPTIVE_STATE_SCHEMA,
    attempts: [...validated.attempts, {
      id: accepted.id,
      revision: accepted.revision,
      track: accepted.track,
      topic: accepted.topic,
      difficulty: accepted.difficulty,
      selectedOptionIds: [...selectedOptionIds],
      correct,
      hinted,
    }],
  });
  return freeze({ state: next, counted: !hinted, reason: hinted ? 'HINTED' : 'DISTINCT_UNHINTED' });
}

export function describeAdaptiveTrack(state, { track, baselineDifficulty }, catalog, pool) {
  const validated = validateAdaptiveState(state, catalog);
  const { poolIdentities, levels } = selectedPool(catalog, pool);
  if (typeof track !== 'string' || !track || !Number.isInteger(baselineDifficulty)) {
    fail('ADAPTIVE_TRACK_INVALID', 'Adaptive track and baseline difficulty are required.');
  }
  const trackCandidates = poolIdentities.filter(identity => identity.track === track);
  if (!trackCandidates.length) fail('ADAPTIVE_TRACK_OUTSIDE_POOL', 'The clinical track is not available in the selected Study pool.');
  const evidence = validated.attempts.filter(attempt => attempt.track === track && !attempt.hinted);
  let requestedDifficulty = clampToAcceptedLevel(evidence.length ? evidence[0].difficulty : baselineDifficulty, levels);
  for (const attempt of evidence) requestedDifficulty = clampToAcceptedLevel(requestedDifficulty + (attempt.correct ? 1 : -1), levels);
  const attemptedKeys = new Set(validated.attempts.map(attempt => `${attempt.id}@${attempt.revision}`));
  const unattempted = trackCandidates.filter(candidate => !attemptedKeys.has(`${candidate.id}@${candidate.revision}`));
  const attemptedInPoolTrack = trackCandidates.filter(candidate => attemptedKeys.has(`${candidate.id}@${candidate.revision}`));
  return freeze({
    track,
    requestedDifficulty,
    acceptedDifficultyLevels: [...levels],
    availableTrackLevels: [...new Set(trackCandidates.map(candidate => candidate.difficulty))].sort((a, b) => a - b),
    unattemptedTrackLevels: [...new Set(unattempted.map(candidate => candidate.difficulty))].sort((a, b) => a - b),
    distinctAttempts: attemptedInPoolTrack.length,
    countedEvidence: evidence.filter(attempt => trackCandidates.some(candidate => candidate.id === attempt.id && candidate.revision === attempt.revision)).length,
    hintedDistinctAttempts: validated.attempts.filter(attempt => attempt.track === track && attempt.hinted
      && trackCandidates.some(candidate => candidate.id === attempt.id && candidate.revision === attempt.revision)).length,
    totalTrackQuestions: trackCandidates.length,
    remainingUnattempted: unattempted.length,
    exhausted: unattempted.length === 0,
  });
}

export function chooseAdaptiveNext(state, { track, baselineDifficulty }, catalog, pool, excludedIds = []) {
  const validated = validateAdaptiveState(state, catalog);
  const status = describeAdaptiveTrack(validated, { track, baselineDifficulty }, catalog, pool);
  const { poolIdentities } = selectedPool(catalog, pool);
  const attemptedKeys = new Set(validated.attempts.map(attempt => `${attempt.id}@${attempt.revision}`));
  const unattempted = poolIdentities.filter(candidate => candidate.track === track
    && !excludedIds.includes(candidate.id)
    && !attemptedKeys.has(`${candidate.id}@${candidate.revision}`));
  if (!unattempted.length) {
    fail('TRACK_EXHAUSTED', `Clinical track ${track} has no unseen accepted questions in the selected pool. Choose another track or explicitly review seen questions. The current question was not changed.`);
  }
  const chosen = [...unattempted].sort((left, right) => {
    const distance = Math.abs(left.difficulty - status.requestedDifficulty) - Math.abs(right.difficulty - status.requestedDifficulty);
    if (distance !== 0) return distance;
    if (left.difficulty !== right.difficulty) return left.difficulty - right.difficulty;
    return poolIdentities.indexOf(left) - poolIdentities.indexOf(right);
  })[0];
  const selection = chosen.difficulty === status.requestedDifficulty
    ? 'EXACT'
    : chosen.difficulty < status.requestedDifficulty ? 'NEAREST_LOWER' : 'NEAREST_HIGHER';
  const message = selection === 'EXACT'
    ? `Selected an unattempted ${track} question at requested difficulty ${status.requestedDifficulty}.`
    : `Requested difficulty ${status.requestedDifficulty} is unavailable among unattempted ${track} questions in this pool; selected nearest accepted difficulty ${chosen.difficulty}.`;
  return freeze({
    identity: { id: chosen.id, revision: chosen.revision },
    decision: {
      track,
      requestedDifficulty: status.requestedDifficulty,
      selectedDifficulty: chosen.difficulty,
      selection,
      remainingUnattemptedBeforeSelection: unattempted.length,
      message,
    },
  });
}
