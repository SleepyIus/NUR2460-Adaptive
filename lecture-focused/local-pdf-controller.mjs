import { validateIssuedSourceLink } from './catalog-runtime.mjs';
import {
  SOURCE_DOCUMENTS,
  normalizeRuntimeOrigin,
  sha256Hex,
  validateSameOriginBlobUrl,
} from './source-security.mjs';

export class LocalPdfAttachmentError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'LocalPdfAttachmentError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new LocalPdfAttachmentError(code, message);
}

function validateDocumentCatalog(documents) {
  if (!documents || typeof documents !== 'object' || Array.isArray(documents)) {
    fail('DOCUMENT_CATALOG_INVALID', 'Attachment document catalog is invalid.');
  }
  const ids = new Set();
  for (const [key, document] of Object.entries(documents)) {
    if (!document || typeof document !== 'object' || document.id !== key
      || typeof document.displayName !== 'string' || !/^[a-f0-9]{64}$/u.test(document.sha256)
      || !Number.isSafeInteger(document.pageCount) || document.pageCount < 1 || ids.has(document.id)) {
      fail('DOCUMENT_CATALOG_INVALID', 'Attachment document catalog has an invalid or duplicate document.');
    }
    ids.add(document.id);
  }
  return Object.values(documents);
}

export class LocalPdfAttachmentController {
  #crypto;
  #urlApi;
  #runtimeOrigin;
  #documents;
  #attachments = new Map();

  constructor({
    cryptoImpl = globalThis.crypto,
    urlApi = globalThis.URL,
    runtimeOrigin = globalThis.location?.origin,
    documents = SOURCE_DOCUMENTS,
    allowSyntheticDocuments = false,
  } = {}) {
    if (documents !== SOURCE_DOCUMENTS && !allowSyntheticDocuments) {
      fail('SYNTHETIC_DOCUMENTS_FORBIDDEN', 'Custom document pins are allowed only in explicit synthetic tests.');
    }
    if (!cryptoImpl?.subtle?.digest || !urlApi?.createObjectURL || !urlApi?.revokeObjectURL) {
      fail('BROWSER_CAPABILITY_UNAVAILABLE', 'Web Crypto and browser object-URL support are required.');
    }
    try {
      this.#runtimeOrigin = normalizeRuntimeOrigin(runtimeOrigin);
    } catch (error) {
      fail('RUNTIME_ORIGIN_INVALID', error.message);
    }
    this.#crypto = cryptoImpl;
    this.#urlApi = urlApi;
    this.#documents = new Map(validateDocumentCatalog(documents).map(document => [document.id, Object.freeze({ ...document })]));
  }

  async attach(documentId, file) {
    const document = this.#documents.get(documentId);
    if (!document) fail('DOCUMENT_UNKNOWN', 'Unknown logical course-document ID.');
    if (!file || typeof file.arrayBuffer !== 'function') fail('FILE_INVALID', 'Choose a local PDF file.');
    if (typeof file.type === 'string' && file.type && file.type.toLowerCase() !== 'application/pdf') {
      fail('FILE_TYPE_INVALID', 'Selected local file is not a PDF.');
    }
    const actualSha256 = await sha256Hex(file, this.#crypto);
    if (actualSha256 !== document.sha256) {
      fail('FILE_HASH_MISMATCH', 'Selected PDF does not match the pinned course document.');
    }

    const localUrl = this.#urlApi.createObjectURL(file);
    try {
      validateSameOriginBlobUrl(localUrl, this.#runtimeOrigin);
    } catch (error) {
      if (typeof localUrl === 'string') this.#safeRevoke(localUrl);
      fail('OBJECT_URL_INVALID', error.message);
    }

    const previous = this.#attachments.get(documentId);
    const attachment = Object.freeze({
      documentId: document.id,
      displayName: document.displayName,
      sha256: document.sha256,
      pageCount: document.pageCount,
      localUrl,
    });
    this.#attachments.set(documentId, attachment);
    if (previous) this.#safeRevoke(previous.localUrl);
    return attachment;
  }

  isAttached(documentId) {
    return this.#attachments.has(documentId);
  }

  href(sourceLink) {
    try {
      validateIssuedSourceLink(sourceLink);
    } catch (error) {
      fail('PUBLIC_LINK_INVALID', error.message);
    }
    const attachment = this.#attachments.get(sourceLink.documentId);
    if (!attachment) fail('ATTACHMENT_MISSING', 'Attach the matching local course PDF before opening this source.');
    if (sourceLink.page > attachment.pageCount) fail('PAGE_OUT_OF_RANGE', 'Source page lies outside the attached PDF.');
    validateSameOriginBlobUrl(attachment.localUrl, this.#runtimeOrigin);
    return `${attachment.localUrl}#page=${sourceLink.page}`;
  }

  detach(documentId) {
    const attachment = this.#attachments.get(documentId);
    if (!attachment) return false;
    this.#attachments.delete(documentId);
    this.#safeRevoke(attachment.localUrl);
    return true;
  }

  dispose() {
    for (const attachment of this.#attachments.values()) this.#safeRevoke(attachment.localUrl);
    this.#attachments.clear();
  }

  #safeRevoke(localUrl) {
    try {
      this.#urlApi.revokeObjectURL(localUrl);
    } catch {
      // Revocation is best-effort; all controller references are still dropped.
    }
  }
}
