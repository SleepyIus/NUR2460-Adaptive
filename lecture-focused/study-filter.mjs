export const STUDY_POOL_SCHEMA = 'nur2460-c32-catalog242-study-pool-1';
export const WEEK_MAPPING_VERSION = 'fall-2026-exam2-coverage-private-3';
export const WEEK_MAPPING_SHA256 = '6a241db16d1d06e79c301748cd0f6744a0caa2fec09449e76a9b6f7f6f3d002a';
export const WEEK_CHOICES = Object.freeze(['All', 4, 5, 6, 7]);
export const TOPIC_CHOICES = Object.freeze(['All', 'Pregnancy', 'Labor', 'Newborn', 'GYN', 'Growth', 'Skin', 'GI']);
export const TOPIC_TO_WEEK = Object.freeze({
  Pregnancy: 4,
  Labor: 5,
  Newborn: 5,
  GYN: 6,
  Growth: 6,
  Skin: 7,
  GI: 7,
});

export class StudyFilterError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'StudyFilterError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new StudyFilterError(code, message);
}

function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join('|') === [...keys].sort().join('|');
}

function validateCatalog(catalog) {
  if (!catalog || typeof catalog.list !== 'function') fail('CATALOG_INVALID', 'Study filters require the accepted Study catalog.');
  const identities = catalog.list();
  if (!Array.isArray(identities) || identities.length !== 242) fail('CATALOG_INVALID', 'Study filters require exactly 242 accepted questions.');
  return identities;
}

function validateSelectors({ week, topic }) {
  if (!WEEK_CHOICES.includes(week)) fail('WEEK_INVALID', 'Choose All weeks or course week 4, 5, 6, or 7.');
  if (!TOPIC_CHOICES.includes(topic)) fail('TOPIC_INVALID', 'Choose All topics or one accepted course topic.');
}

function selectedIdentities(identities, { week, topic }) {
  return identities.filter(identity => (week === 'All' || TOPIC_TO_WEEK[identity.topic] === week)
    && (topic === 'All' || identity.topic === topic));
}

function freezePool(pool) {
  pool.membership.forEach(Object.freeze);
  Object.freeze(pool.membership);
  return Object.freeze(pool);
}

export function createStudyPool(catalog, { week = 'All', topic = 'All' } = {}) {
  const identities = validateCatalog(catalog);
  validateSelectors({ week, topic });
  const selected = selectedIdentities(identities, { week, topic });
  if (selected.length === 0) {
    fail('EMPTY_POOL', `Week ${week} and topic ${topic} contain no accepted Study questions. The current pool was not changed.`);
  }
  return freezePool({
    schema: STUDY_POOL_SCHEMA,
    mappingVersion: WEEK_MAPPING_VERSION,
    mappingSha256: WEEK_MAPPING_SHA256,
    week,
    topic,
    membership: selected.map(({ id, revision }) => ({ id, revision })),
  });
}

export function validateStudyPool(pool, catalog) {
  if (!exactKeys(pool, ['schema', 'mappingVersion', 'mappingSha256', 'week', 'topic', 'membership'])
    || pool.schema !== STUDY_POOL_SCHEMA
    || pool.mappingVersion !== WEEK_MAPPING_VERSION
    || pool.mappingSha256 !== WEEK_MAPPING_SHA256) {
    fail('POOL_SHAPE_INVALID', 'Saved Study pool does not match the accepted c32 catalog242 filter schema and course mapping.');
  }
  const identities = validateCatalog(catalog);
  validateSelectors(pool);
  if (!Array.isArray(pool.membership) || pool.membership.length === 0) fail('EMPTY_POOL', 'Saved Study pool is empty.');
  const expected = selectedIdentities(identities, pool);
  if (expected.length === 0 || expected.length !== pool.membership.length) {
    fail('POOL_MEMBERSHIP_INVALID', 'Saved Study pool membership does not match its week and topic filters.');
  }
  for (let index = 0; index < expected.length; index += 1) {
    const observed = pool.membership[index];
    const identity = expected[index];
    if (!exactKeys(observed, ['id', 'revision']) || observed.id !== identity.id || observed.revision !== identity.revision) {
      fail('POOL_MEMBERSHIP_INVALID', 'Saved Study pool membership or selected order is not exact.');
    }
  }
  return freezePool({
    schema: pool.schema,
    mappingVersion: pool.mappingVersion,
    mappingSha256: pool.mappingSha256,
    week: pool.week,
    topic: pool.topic,
    membership: pool.membership.map(({ id, revision }) => ({ id, revision })),
  });
}
