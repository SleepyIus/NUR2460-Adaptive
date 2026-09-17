// Browser adapter for the accepted selector. The private selector uses
// node:crypto; this candidate has exactly 80 eligible, unique-family questions,
// so the strict feasible set is the full eligible set. Runtime randomness only
// varies its order while preserving the accepted quotas and spacing constraint.
export const HARD80_TOPIC_QUOTAS = Object.freeze({
  Pregnancy: 15,
  Labor: 15,
  Newborn: 15,
  GYN: 15,
  Growth: 10,
  Skin: 5,
  GI: 5,
});
export const HARD80_TOTAL = 80;
export const HARD80_SPACING = Object.freeze([
  Object.freeze({ ids: Object.freeze(['h80-q048', 'sf1-q170']), minimumIntervening: 3 }),
]);
export const HARD80_IMPLEMENTATION_EQUIVALENCE = Object.freeze({
  eligibility: 'literal hard80Eligible === true only',
  quotas: HARD80_TOPIC_QUOTAS,
  familyIdentity: '[topic, track, evidenceFamily]',
  explicitConflictGroups: 0,
  feasibleSet: 'all 80 eligible questions; no fallback or substitution',
  ordering: 'browser-crypto Fisher–Yates with accepted final-form spacing',
});

function selectorRandomIndex(length) {
  if (!Number.isSafeInteger(length) || length < 1) throw Error('Invalid shuffle length.');
  const limit = Math.floor(4294967296 / length) * length;
  const values = new Uint32Array(1);
  do crypto.getRandomValues(values); while (values[0] >= limit);
  return values[0] % length;
}

export function hard80Random() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] / 4294967296;
}

export function hard80Shuffle(values, rng = hard80Random) {
  const output = [...values];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swap = rng === hard80Random
      ? selectorRandomIndex(index + 1)
      : Math.floor(rng() * (index + 1));
    if (!Number.isInteger(swap) || swap < 0 || swap > index) throw Error('Invalid randomness source.');
    [output[index], output[swap]] = [output[swap], output[index]];
  }
  return output;
}

function selectorFamily(question) {
  return JSON.stringify([question.topic, question.track, question.evidenceFamily]);
}

function validateConflictGroups(groups, knownIds) {
  if (!Array.isArray(groups)) throw Error('Hard 80 conflict groups must be an array.');
  return groups.map((group, index) => {
    const ids = Array.isArray(group) ? group : group?.ids;
    if (!Array.isArray(ids) || ids.length < 2 || new Set(ids).size !== ids.length
      || ids.some(id => typeof id !== 'string' || !knownIds.has(id))) {
      throw Error(`Hard 80 conflict group ${index} is invalid.`);
    }
    return [...ids];
  });
}

function validateExactHard80(questions, conflictGroups = []) {
  if (!Array.isArray(questions) || questions.length !== HARD80_TOTAL) {
    throw Error('Hard 80 requires exactly 80 questions.');
  }
  const ids = new Set();
  const families = new Set();
  const topicCounts = Object.fromEntries(Object.keys(HARD80_TOPIC_QUOTAS).map(topic => [topic, 0]));
  for (const question of questions) {
    if (!question || question.hard80Eligible !== true) throw Error('Hard 80 cannot use an ineligible question.');
    if (ids.has(question.id)) throw Error(`Hard 80 repeats question ${question.id}.`);
    const family = selectorFamily(question);
    if (families.has(family)) throw Error(`Hard 80 repeats family ${family}.`);
    if (!Object.hasOwn(topicCounts, question.topic)) throw Error(`Hard 80 has unknown topic ${question.topic}.`);
    ids.add(question.id);
    families.add(family);
    topicCounts[question.topic] += 1;
  }
  for (const [topic, quota] of Object.entries(HARD80_TOPIC_QUOTAS)) {
    if (topicCounts[topic] !== quota) throw Error(`Hard 80 has the wrong ${topic} quota.`);
  }
  for (const group of validateConflictGroups(conflictGroups, ids)) {
    if (group.filter(id => ids.has(id)).length > 1) throw Error('Hard 80 contains an explicit conflict group.');
  }
  return topicCounts;
}

function spacingSatisfied(questions) {
  const positions = new Map(questions.map((question, index) => [question.id, index]));
  return HARD80_SPACING.every(({ ids, minimumIntervening }) => {
    const [left, right] = ids.map(id => positions.get(id));
    return left === undefined || right === undefined || Math.abs(left - right) - 1 >= minimumIntervening;
  });
}

export function selectHard80ForExam(bank, { rng = hard80Random, conflictGroups = [] } = {}) {
  if (!bank || !Array.isArray(bank.questions)) throw Error('Hard 80 requires a question bank.');
  const eligible = bank.questions.filter(question => question.hard80Eligible === true);
  const topicCounts = validateExactHard80(eligible, conflictGroups);
  for (let attempt = 0; attempt < 512; attempt += 1) {
    const ordered = hard80Shuffle(eligible, rng);
    if (spacingSatisfied(ordered)) {
      return {
        questions: structuredClone(ordered),
        topicCounts,
        attempts: attempt + 1,
        adapter: HARD80_IMPLEMENTATION_EQUIVALENCE,
      };
    }
  }
  throw Error('Hard 80 could not satisfy final-form spacing without changing the accepted set.');
}

export function replayHard80Order(bank, savedOrder, { conflictGroups = [] } = {}) {
  if (!Array.isArray(savedOrder) || savedOrder.length !== HARD80_TOTAL) {
    throw Error('Saved Hard 80 order must contain exactly 80 identities.');
  }
  const byId = new Map(bank.questions.map(question => [question.id, question]));
  const questions = savedOrder.map((record, index) => {
    if (!record || Object.keys(record).sort().join('|') !== 'id|revision'
      || typeof record.id !== 'string' || typeof record.revision !== 'string') {
      throw Error(`Saved Hard 80 order record ${index} is invalid.`);
    }
    const question = byId.get(record.id);
    if (!question || question.revision !== record.revision) {
      throw Error(`Saved Hard 80 question ${record.id}@${record.revision} is unavailable.`);
    }
    return question;
  });
  const topicCounts = validateExactHard80(questions, conflictGroups);
  if (!spacingSatisfied(questions)) throw Error('Saved Hard 80 order violates final-form spacing.');
  return { questions: structuredClone(questions), topicCounts };
}
