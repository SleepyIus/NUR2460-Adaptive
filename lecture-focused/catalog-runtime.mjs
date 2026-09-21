import { ACCEPTED_CATALOG_LEDGER } from './accepted-catalog-ledger.mjs';
import { ACCEPTED_STUDY_PAYLOAD } from './accepted-study-payload.mjs';
import { SOURCE_DOCUMENTS } from './source-security.mjs';

const EXPECTED_SCHEMA = 'nur2460-c32-catalog242-public-study-payload-1';
export const SYNTHETIC_NAMESPACE = 'lecture-focused-private-c32-catalog242-synthetic';
const EXPECTED_IDENTITIES = ACCEPTED_CATALOG_LEDGER.identities;
const EXPECTED_FINGERPRINTS = ACCEPTED_CATALOG_LEDGER.publicQuestionFingerprints;
const LEGACY_NULL_FLAGS = new Set(ACCEPTED_CATALOG_LEDGER.legacyNullKeys);
const PROVISIONAL_HARD80_FLAGS = new Set(ACCEPTED_CATALOG_LEDGER.provisionalHard80Keys);
const AUTHORIZED_SOURCE_LINKS = new WeakSet();

export class BrowserCatalogError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'BrowserCatalogError';
    this.code = code;
  }
}

function invariant(condition, code, message) {
  if (!condition) throw new BrowserCatalogError(code, message);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function publicFingerprint(value) {
  let hash = 0x811c9dc5;
  for (const character of JSON.stringify(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function text(value, field, max = 10_000) {
  invariant(typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= max,
    'INVALID_PAYLOAD', `${field} must be a nonempty normalized string.`);
  return value;
}

function validateSourceLink(link, questionId) {
  invariant(link && typeof link === 'object' && !Array.isArray(link), 'INVALID_SOURCE', `${questionId} has an invalid source link.`);
  const document = SOURCE_DOCUMENTS[link.documentId];
  invariant(document, 'INVALID_SOURCE', `${questionId} references an unknown source document.`);
  invariant(Number.isInteger(link.page) && link.page >= 1 && link.page <= document.pageCount,
    'INVALID_SOURCE', `${questionId} has an out-of-range source page.`);
  text(link.label, 'source label', 240);
  invariant(!/[<>]/u.test(link.label), 'INVALID_SOURCE', `${questionId} has an unsafe source label.`);
  if (link.destination !== undefined) {
    invariant(/^exam2-[a-z0-9-]+$/u.test(link.destination), 'INVALID_SOURCE', `${questionId} has an invalid source destination.`);
  }
  const issued = Object.freeze({
    documentId: link.documentId,
    label: link.label,
    page: link.page,
    ...(link.destination === undefined ? {} : { destination: link.destination }),
  });
  AUTHORIZED_SOURCE_LINKS.add(issued);
  return issued;
}

function validateQuestion(raw, identity, index) {
  invariant(raw?.id === identity.id && raw?.revision === identity.revision,
    'IDENTITY_MISMATCH', `Question ${index + 1} does not match the frozen catalog242 identity ledger.`);
  invariant(publicFingerprint(raw) === EXPECTED_FINGERPRINTS[index],
    'PROJECTION_MISMATCH', `${raw.id} does not match its frozen public-question projection.`);
  invariant(raw.kind === 'MC' || raw.kind === 'SATA', 'INVALID_PAYLOAD', `${raw.id} has an invalid question kind.`);
  for (const field of ['topic', 'track', 'evidenceFamily', 'objective', 'stem']) text(raw[field], `${raw.id}.${field}`);
  invariant(Number.isInteger(raw.difficulty) && raw.difficulty >= 1, 'INVALID_PAYLOAD', `${raw.id} has an invalid difficulty.`);
  const key = `${raw.id}@${raw.revision}`;
  const retainedLegacyNull = LEGACY_NULL_FLAGS.has(key) && raw.hard80Eligible === null;
  const provisionalHard80 = PROVISIONAL_HARD80_FLAGS.has(key) && raw.hard80Eligible === true;
  invariant(raw.hard80Eligible === false || retainedLegacyNull || provisionalHard80,
    'INVALID_PAYLOAD', `${raw.id} does not retain its accepted Hard80 eligibility identity.`);
  invariant(Array.isArray(raw.skills) && raw.skills.length > 0, 'INVALID_PAYLOAD', `${raw.id} has invalid skills.`);
  raw.skills.forEach((skill, skillIndex) => text(skill, `${raw.id}.skills[${skillIndex}]`, 120));
  invariant(Array.isArray(raw.options) && raw.options.length >= 2, 'INVALID_PAYLOAD', `${raw.id} has invalid options.`);

  const optionIds = new Set();
  const options = raw.options.map(option => {
    text(option?.id, `${raw.id}.option.id`, 80);
    text(option?.text, `${raw.id}.${option.id}.text`);
    invariant(!optionIds.has(option.id), 'INVALID_PAYLOAD', `${raw.id} repeats option ID ${option.id}.`);
    optionIds.add(option.id);
    return Object.freeze({ id: option.id, text: option.text });
  });

  const review = raw.answerReview;
  invariant(review && typeof review === 'object', 'INVALID_PAYLOAD', `${raw.id} has no answer review.`);
  for (const field of ['clue', 'rationale', 'difficultyReason']) text(review[field], `${raw.id}.answerReview.${field}`);
  invariant(Array.isArray(review.limitations), 'INVALID_PAYLOAD', `${raw.id} has invalid limitations.`);
  review.limitations.forEach((limitation, limitationIndex) => text(limitation, `${raw.id}.limitations[${limitationIndex}]`));
  invariant(Array.isArray(review.options) && review.options.length === options.length,
    'INVALID_PAYLOAD', `${raw.id} answer review does not match its options.`);
  const reviewedIds = new Set();
  const reviewedOptions = review.options.map(option => {
    invariant(optionIds.has(option?.id) && !reviewedIds.has(option.id), 'INVALID_PAYLOAD', `${raw.id} has an invalid reviewed option.`);
    invariant(typeof option.correct === 'boolean', 'INVALID_PAYLOAD', `${raw.id}.${option.id} has no correctness boolean.`);
    text(option.reason, `${raw.id}.${option.id}.reason`);
    reviewedIds.add(option.id);
    return Object.freeze({ id: option.id, correct: option.correct, reason: option.reason });
  });
  const correctCount = reviewedOptions.filter(option => option.correct).length;
  invariant(correctCount >= 1, 'INVALID_PAYLOAD', `${raw.id} has no correct answer.`);
  invariant(raw.kind !== 'MC' || correctCount === 1, 'INVALID_PAYLOAD', `${raw.id} MC item must have exactly one correct answer.`);

  invariant(Array.isArray(raw.sourceLinks) && raw.sourceLinks.length > 0, 'INVALID_SOURCE', `${raw.id} has no accepted source link.`);
  invariant(raw.sourceWarning === null || typeof raw.sourceWarning === 'string', 'INVALID_SOURCE', `${raw.id} has an invalid source warning.`);
  if (typeof raw.sourceWarning === 'string') text(raw.sourceWarning, `${raw.id}.sourceWarning`);

  return deepFreeze({
    id: raw.id,
    revision: raw.revision,
    topic: raw.topic,
    track: raw.track,
    evidenceFamily: raw.evidenceFamily,
    difficulty: raw.difficulty,
    kind: raw.kind,
    skills: [...raw.skills],
    objective: raw.objective,
    stem: raw.stem,
    options,
    hard80Eligible: raw.hard80Eligible,
    answerReview: {
      clue: review.clue,
      rationale: review.rationale,
      difficultyReason: review.difficultyReason,
      limitations: [...review.limitations],
      options: reviewedOptions,
    },
    sourceLinks: raw.sourceLinks.map(link => validateSourceLink(link, raw.id)),
    sourceWarning: raw.sourceWarning,
  });
}

function prepareCatalog(payload) {
  invariant(ACCEPTED_CATALOG_LEDGER.schema === 'nur2460-c32-catalog242-ledger-1'
    && ACCEPTED_CATALOG_LEDGER.count === 242
    && ACCEPTED_CATALOG_LEDGER.sourceLinks === 473
    && Array.isArray(EXPECTED_FINGERPRINTS)
    && EXPECTED_FINGERPRINTS.length === 242,
  'INVALID_LEDGER', 'The deployable catalog242 identity ledger is invalid.');
  invariant(payload?.schema === EXPECTED_SCHEMA, 'INVALID_PAYLOAD', 'The public payload schema is not accepted.');
  invariant(payload.namespace === SYNTHETIC_NAMESPACE, 'INVALID_NAMESPACE', 'The payload namespace is not the private c32 catalog242 namespace.');
  invariant(payload.status === 'PRIVATE_PROTOTYPE_NOT_RELEASED', 'INVALID_STATUS', 'The prototype status is not accepted.');
  invariant(payload.hard80?.enabled === false && payload.hard80?.accepted === 1 && payload.hard80?.provisionalEligible === 1,
    'INVALID_HARD80', 'Hard80 must remain disabled with exactly one provisional accepted Growth candidate.');
  text(payload.hard80.message, 'hard80.message');
  invariant(Array.isArray(payload.questions) && payload.questions.length === EXPECTED_IDENTITIES.length,
    'INVALID_COUNT', 'The public payload must contain exactly 242 accepted questions.');
  const questions = payload.questions.map((question, index) => validateQuestion(question, EXPECTED_IDENTITIES[index], index));
  invariant(questions.flatMap(question => question.sourceLinks).length === ACCEPTED_CATALOG_LEDGER.sourceLinks,
    'INVALID_SOURCE', 'The public payload does not contain the exact 473 accepted source links.');
  invariant(questions.filter(question => question.hard80Eligible === true).length === 1,
    'INVALID_HARD80', 'The public payload must preserve exactly one provisional Hard80-eligible item.');
  return Object.freeze(questions);
}

export function validateAcceptedStudyPayloadForTest(payload) {
  return prepareCatalog(payload);
}

const QUESTIONS = prepareCatalog(ACCEPTED_STUDY_PAYLOAD);
const QUESTION_BY_ID = new Map(QUESTIONS.map(question => [question.id, question]));

function resolveIdentity({ id, revision } = {}) {
  const question = QUESTION_BY_ID.get(id);
  invariant(question, 'UNKNOWN_ID', 'The requested question is not in the accepted catalog.');
  invariant(question.revision === revision, 'REVISION_MISMATCH', 'The requested question revision is not accepted.');
  return question;
}

export function validateIssuedSourceLink(link) {
  invariant(link && typeof link === 'object' && AUTHORIZED_SOURCE_LINKS.has(link),
    'UNAUTHORIZED_SOURCE_LINK', 'Only source links issued by this catalog may be opened.');
  const document = SOURCE_DOCUMENTS[link.documentId];
  invariant(document && Number.isInteger(link.page) && link.page >= 1 && link.page <= document.pageCount,
    'INVALID_SOURCE', 'The issued source link is invalid.');
  return link;
}

export function createBrowserStudyCatalog() {
  return Object.freeze({
    namespace: SYNTHETIC_NAMESPACE,
    size: QUESTIONS.length,
    hard80: deepFreeze({ ...ACCEPTED_STUDY_PAYLOAD.hard80 }),
    list() {
      return QUESTIONS.map(question => Object.freeze({
        id: question.id,
        revision: question.revision,
        topic: question.topic,
        track: question.track,
        kind: question.kind,
        difficulty: question.difficulty,
      }));
    },
    getQuestion({ id, revision, reveal = false } = {}) {
      const question = resolveIdentity({ id, revision });
      return deepFreeze({
        id: question.id,
        revision: question.revision,
        topic: question.topic,
        track: question.track,
        evidenceFamily: question.evidenceFamily,
        difficulty: question.difficulty,
        kind: question.kind,
        skills: [...question.skills],
        objective: question.objective,
        stem: question.stem,
        options: question.options.map(option => ({ ...option })),
        hard80Eligible: question.hard80Eligible,
        answerReview: reveal ? question.answerReview : null,
        sourceLinks: reveal ? question.sourceLinks : [],
        sourceWarning: reveal ? question.sourceWarning : null,
      });
    },
    grade({ id, revision, selectedOptionIds } = {}) {
      const question = resolveIdentity({ id, revision });
      invariant(Array.isArray(selectedOptionIds), 'INVALID_SELECTION', 'Selected option IDs must be an array.');
      const validIds = new Set(question.options.map(option => option.id));
      const selected = new Set();
      for (const optionId of selectedOptionIds) {
        invariant(validIds.has(optionId) && !selected.has(optionId), 'INVALID_SELECTION', 'The selection contains an invalid or repeated option ID.');
        selected.add(optionId);
      }
      invariant(selected.size > 0, 'EMPTY_SELECTION', 'Choose at least one answer before submitting.');
      invariant(question.kind !== 'MC' || selected.size === 1, 'INVALID_SELECTION', 'Choose exactly one answer for this question.');
      const correctOptionIds = question.answerReview.options.filter(option => option.correct).map(option => option.id);
      const correct = selected.size === correctOptionIds.length && correctOptionIds.every(optionId => selected.has(optionId));
      return deepFreeze({ correct, selectedOptionIds: [...selected], correctOptionIds });
    },
  });
}

export const ACCEPTED_IDENTITIES = EXPECTED_IDENTITIES.map(({ id, revision }) => Object.freeze({ id, revision }));
Object.freeze(ACCEPTED_IDENTITIES);
