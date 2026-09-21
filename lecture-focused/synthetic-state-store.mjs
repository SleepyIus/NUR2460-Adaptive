import { SYNTHETIC_NAMESPACE, createBrowserStudyCatalog } from './catalog-runtime.mjs';
import { createStudySession } from './study-engine.mjs';

export const SYNTHETIC_STORAGE_KEY = 'nur2460:synthetic:c32:lecture-focused-catalog242-study-state:v1';
export const SYNTHETIC_BACKUP_SCHEMA = 'nur2460-c32-catalog242-synthetic-browser-backup-1';
export const CONFLICT_STRATEGY = 'OPTIMISTIC_STALE_WRITE_REJECTION';

let fallbackWriteCounter = 0;

export class SyntheticStorageError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'SyntheticStorageError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new SyntheticStorageError(code, message);
}

function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join('|') === [...keys].sort().join('|');
}

function validStorageVersion(value, { allowNull = false } = {}) {
  return (allowNull && value === null)
    || (typeof value === 'string' && value.length >= 1 && value.length <= 128 && /^[A-Za-z0-9._:-]+$/u.test(value));
}

function defaultWriteId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return `write-${globalThis.crypto.randomUUID()}`;
  fallbackWriteCounter += 1;
  return `write-${Date.now().toString(36)}-${fallbackWriteCounter.toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function resolveStorage(storage) {
  let resolved = storage;
  if (resolved === undefined) {
    try {
      resolved = globalThis.localStorage;
    } catch {
      fail('STORAGE_UNAVAILABLE', 'Synthetic browser storage is unavailable. Study may continue without reload persistence.');
    }
  }
  if (!resolved || typeof resolved.getItem !== 'function' || typeof resolved.setItem !== 'function'
    || typeof resolved.removeItem !== 'function') {
    fail('STORAGE_UNAVAILABLE', 'Synthetic browser storage is unavailable. Study may continue without reload persistence.');
  }
  return resolved;
}

export function createSyntheticStateStore({
  catalog = createBrowserStudyCatalog(),
  storage,
  makeWriteId = defaultWriteId,
} = {}) {
  if (catalog?.namespace !== SYNTHETIC_NAMESPACE || typeof catalog.list !== 'function') {
    fail('CATALOG_INVALID', 'Synthetic persistence requires the accepted c32 catalog242 catalog.');
  }
  if (typeof makeWriteId !== 'function') fail('STORAGE_VERSION_INVALID', 'Synthetic persistence requires a write-ID factory.');
  const identities = Object.freeze(catalog.list().map(({ id, revision }) => Object.freeze({ id, revision })));
  if (identities.length !== 242) fail('CATALOG_INVALID', 'Synthetic persistence requires exactly 242 accepted identities.');
  const browserStorage = resolveStorage(storage);
  let knownStorageVersion = null;
  let externalConflict = false;

  function validateSession(session) {
    if (session?.namespace !== SYNTHETIC_NAMESPACE
      || typeof session.exportSyntheticState !== 'function'
      || typeof session.restoreSyntheticState !== 'function') {
      fail('SESSION_INVALID', 'Synthetic persistence requires a c32 catalog242 Study session.');
    }
  }

  function envelopeFor(session, storageVersion = knownStorageVersion) {
    validateSession(session);
    if (!validStorageVersion(storageVersion, { allowNull: true })) fail('STORAGE_VERSION_INVALID', 'Synthetic storage version is invalid.');
    return {
      schema: SYNTHETIC_BACKUP_SCHEMA,
      namespace: SYNTHETIC_NAMESPACE,
      storageVersion,
      catalog: identities.map(identity => ({ ...identity })),
      session: session.exportSyntheticState(),
    };
  }

  function parseAndValidate(serialized, { requireStoredVersion = false } = {}) {
    if (typeof serialized !== 'string' || serialized.length < 2 || serialized.length > 200_000) {
      fail('BACKUP_TEXT_INVALID', 'Backup must be a reasonably sized JSON text value.');
    }
    let envelope;
    try {
      envelope = JSON.parse(serialized);
    } catch {
      fail('BACKUP_JSON_INVALID', 'Backup is not valid JSON. Current progress was not replaced.');
    }
    if (!exactKeys(envelope, ['schema', 'namespace', 'storageVersion', 'catalog', 'session'])) {
      fail('BACKUP_SHAPE_INVALID', 'Backup contains missing or unexpected top-level fields. Current progress was not replaced.');
    }
    if (envelope.schema !== SYNTHETIC_BACKUP_SCHEMA || envelope.namespace !== SYNTHETIC_NAMESPACE) {
      fail('BACKUP_NAMESPACE_INVALID', 'Backup belongs to a different or unsupported Study namespace. Current progress was not replaced.');
    }
    if (!validStorageVersion(envelope.storageVersion, { allowNull: !requireStoredVersion })) {
      fail('BACKUP_VERSION_INVALID', 'Backup storage version is missing or invalid. Current progress was not replaced.');
    }
    if (!Array.isArray(envelope.catalog) || envelope.catalog.length !== identities.length) {
    fail('BACKUP_CATALOG_INVALID', 'Backup does not contain the exact accepted 242-question revision ledger. Current progress was not replaced.');
    }
    for (let index = 0; index < identities.length; index += 1) {
      const observed = envelope.catalog[index];
      const expected = identities[index];
      if (!exactKeys(observed, ['id', 'revision']) || observed.id !== expected.id || observed.revision !== expected.revision) {
        fail('BACKUP_CATALOG_INVALID', 'Backup question IDs or revisions do not match the accepted catalog. Current progress was not replaced.');
      }
    }
    try {
      createStudySession({ catalog, random: () => 0.5, initialState: envelope.session });
    } catch {
      fail('BACKUP_STATE_INVALID', 'Backup pool, batch, exposure, history, question, revision, option order, hint, selection, or current submission state is invalid. Current progress was not replaced.');
    }
    return envelope;
  }

  function readStoredText() {
    try {
      return browserStorage.getItem(SYNTHETIC_STORAGE_KEY);
    } catch {
      fail('STORAGE_READ_FAILED', 'Synthetic progress could not be read. Current in-page progress was not changed.');
    }
  }

  function readStoredEnvelope() {
    const serialized = readStoredText();
    return serialized === null ? null : parseAndValidate(serialized, { requireStoredVersion: true });
  }

  function conflict() {
    externalConflict = true;
    fail('STORAGE_CONFLICT', 'Another tab changed c32 synthetic progress after this tab loaded. This tab did not overwrite it. Reload newer saved progress before continuing.');
  }

  function ensureCurrentWriteBase() {
    const current = readStoredEnvelope();
    const currentVersion = current?.storageVersion ?? null;
    if (externalConflict || currentVersion !== knownStorageVersion) conflict();
    return current;
  }

  function nextStorageVersion() {
    const candidate = makeWriteId();
    if (!validStorageVersion(candidate) || candidate === knownStorageVersion) {
      fail('STORAGE_VERSION_INVALID', 'Write-ID factory must return a new short token containing only letters, numbers, dot, underscore, colon, or hyphen.');
    }
    return candidate;
  }

  function writeAndVerify(envelope) {
    const serialized = JSON.stringify(envelope);
    try {
      browserStorage.setItem(SYNTHETIC_STORAGE_KEY, serialized);
    } catch {
      fail('STORAGE_WRITE_FAILED', 'Synthetic progress could not be saved. Study may continue in this page, but reload persistence is unavailable.');
    }
    // Web Storage has no atomic compare-and-swap. This readback detects an
    // interleaved overwrite that completed before verification; storage events
    // surface later writes. A truly simultaneous last-write race remains a
    // documented platform limit rather than a claimed atomic guarantee.
    const observed = readStoredEnvelope();
    if (!observed || observed.storageVersion !== envelope.storageVersion) conflict();
    knownStorageVersion = envelope.storageVersion;
    externalConflict = false;
    return serialized;
  }

  function save(session) {
    validateSession(session);
    ensureCurrentWriteBase();
    const storageVersion = nextStorageVersion();
    return writeAndVerify(envelopeFor(session, storageVersion));
  }

  function load(session) {
    validateSession(session);
    const serialized = readStoredText();
    if (serialized === null) {
      knownStorageVersion = null;
      externalConflict = false;
      return Object.freeze({ restored: false, state: session.getView(), storageVersion: null });
    }
    const envelope = parseAndValidate(serialized, { requireStoredVersion: true });
    const state = session.restoreSyntheticState(envelope.session);
    knownStorageVersion = envelope.storageVersion;
    externalConflict = false;
    return Object.freeze({ restored: true, state, storageVersion: knownStorageVersion });
  }

  function exportBackup(session) {
    return JSON.stringify(envelopeFor(session), null, 2);
  }

  function restoreBackup(serialized, session) {
    const backup = parseAndValidate(serialized);
    validateSession(session);
    ensureCurrentWriteBase();
    const previousState = structuredClone(session.exportSyntheticState());
    const storageVersion = nextStorageVersion();
    let restored;
    try {
      restored = session.restoreSyntheticState(backup.session);
    } catch {
      fail('BACKUP_STATE_INVALID', 'Validated backup could not replace the current c32 catalog242 session. Current progress was not changed.');
    }
    try {
      writeAndVerify({ ...backup, storageVersion });
    } catch (error) {
      try {
        session.restoreSyntheticState(previousState);
      } catch {
        fail('STORAGE_ROLLBACK_FAILED', 'Validated backup could not be saved and the in-page rollback failed. Stop using this page and reload.');
      }
      throw error;
    }
    return restored;
  }

  function clear() {
    ensureCurrentWriteBase();
    try {
      browserStorage.removeItem(SYNTHETIC_STORAGE_KEY);
    } catch {
      fail('STORAGE_CLEAR_FAILED', 'Synthetic saved progress could not be cleared.');
    }
    if (readStoredText() !== null) fail('STORAGE_CLEAR_FAILED', 'Synthetic saved progress still exists after the clear request.');
    knownStorageVersion = null;
    externalConflict = false;
  }

  function observeExternalChange(serialized) {
    if (serialized === null) {
      externalConflict = knownStorageVersion !== null;
      return Object.freeze({ conflict: externalConflict, storageVersion: null });
    }
    let envelope;
    try {
      envelope = parseAndValidate(serialized, { requireStoredVersion: true });
    } catch (error) {
      externalConflict = true;
      throw error;
    }
    externalConflict = envelope.storageVersion !== knownStorageVersion;
    return Object.freeze({ conflict: externalConflict, storageVersion: envelope.storageVersion });
  }

  function getConcurrencyStatus() {
    return Object.freeze({
      strategy: CONFLICT_STRATEGY,
      atomicCompareAndSwap: false,
      knownStorageVersion,
      conflict: externalConflict,
      limit: 'Web Storage has no atomic compare-and-swap; simultaneous writes that interleave before readback or a storage event are not guaranteed. Use one active editing tab for strongest behavior.',
    });
  }

  return Object.freeze({
    key: SYNTHETIC_STORAGE_KEY,
    identities,
    save,
    load,
    exportBackup,
    restoreBackup,
    validateBackup: parseAndValidate,
    clear,
    observeExternalChange,
    getConcurrencyStatus,
  });
}
