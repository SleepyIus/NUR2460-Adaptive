import blueprintScope from './blueprint-scope.json' with { type: 'json' };

export const BLUEPRINT_SCOPE_VERSION = 'exam2-blueprint-topics-1';
export const BLUEPRINT_SCOPE_SHA256 = '7af79abae70f76bf054f872cf80f7589f844264c7b913e67a8b287d97c2e6ab6';
export const STUDY_SCOPE_KEYS = ['scope', 'scopeMapVersion', 'scopeMapSha256'];
const blueprintIncludedGyn = new Set(Object.values(blueprintScope.gynGroups).flat());
const blueprintValidatedBanks = new WeakSet();

export function validateBlueprintScope(bank) {
  if (blueprintValidatedBanks.has(bank)) return blueprintScope;
  const included = Object.values(blueprintScope.gynGroups).flat();
  const outside = Object.values(blueprintScope.gynOutside).flat();
  const gyn = bank.questions.filter(q => q.topic === 'GYN').map(q => q.id);
  const classified = [...included, ...outside];
  if (blueprintScope.version !== BLUEPRINT_SCOPE_VERSION || bank.version !== blueprintScope.bankVersion
    || bank.questions.length !== 445 || gyn.length !== 83 || included.length !== 52
    || new Set(classified).size !== classified.length || classified.length !== gyn.length
    || gyn.some(id => !classified.includes(id))
    || bank.questions.some(q => q.topic !== 'GYN' && !Object.hasOwn(blueprintScope.broadTopics, q.topic))) {
    throw Error('The Blueprint-only topic mapping is unavailable for this bank. No session was changed.');
  }
  blueprintValidatedBanks.add(bank);
  return blueprintScope;
}

export function studyScope(value) {
  const scope = value?.scope ?? 'full';
  if (!['full', 'blueprint'].includes(scope)) throw Error('Choose a valid Study scope.');
  return scope;
}

export function studyScopeLabel(value) {
  return studyScope(value) === 'blueprint' ? 'Blueprint-only topics' : 'Full course coverage';
}

export function scopeAllowsQuestion(question, scope, bank) {
  if (studyScope({ scope }) === 'full') return true;
  validateBlueprintScope(bank);
  return question.topic === 'GYN' ? blueprintIncludedGyn.has(question.id) : Object.hasOwn(blueprintScope.broadTopics, question.topic);
}

export function createStudyScopeFields(settings, bank) {
  if (studyScope(settings) === 'full') return {}; // Preserve the exact legacy/full filter shape.
  validateBlueprintScope(bank);
  return { scope: 'blueprint', scopeMapVersion: BLUEPRINT_SCOPE_VERSION, scopeMapSha256: BLUEPRINT_SCOPE_SHA256 };
}

export function validateStudyScopeFilter(filter, bank) {
  const present = STUDY_SCOPE_KEYS.filter(key => Object.hasOwn(filter, key));
  if (!present.length) return 'full';
  if (present.length !== STUDY_SCOPE_KEYS.length || filter.scope !== 'blueprint'
    || filter.scopeMapVersion !== BLUEPRINT_SCOPE_VERSION || filter.scopeMapSha256 !== BLUEPRINT_SCOPE_SHA256) {
    throw Error('This Study session needs an unavailable Blueprint-only mapping. Nothing was replaced.');
  }
  validateBlueprintScope(bank);
  return 'blueprint';
}

export function reconcileScopeDraft(settings, scope, bank) {
  studyScope({ scope });
  if (scope === 'blueprint') validateBlueprintScope(bank);
  const cleared = Boolean(settings.focus) && !bank.questions.some(q => q.track === settings.focus && scopeAllowsQuestion(q, scope, bank));
  return {
    settings: { ...settings, scope, focus: cleared ? '' : settings.focus },
    visibleStatus: `${studyScopeLabel({ scope })} selected for your next session.${cleared ? ' Optional focus was cleared because it is outside this scope.' : ''} Your current session has not changed.`,
  };
}
