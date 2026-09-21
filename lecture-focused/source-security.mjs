export const SOURCE_DOCUMENTS = Object.freeze({
  'exam2-instructor-notes': Object.freeze({
    id: 'exam2-instructor-notes',
    displayName: 'NUR2460 Exam 2 Instructor Notes',
    sha256: '8dd0b2c0982918c6fb68ea6bca4daa0319b41cdb23cde60a5857f0cfb85c000f',
    pageCount: 137,
  }),
  'exam2-lecture-slides': Object.freeze({
    id: 'exam2-lecture-slides',
    displayName: 'NUR2460 Exam 2 Lecture Slides',
    sha256: '228ca9e0c4bcbdf56e38384409c761aaf6e049dffe0cdb9e81f82ef7e01e3885',
    pageCount: 179,
  }),
});

export function normalizeRuntimeOrigin(value) {
  if (typeof value !== 'string') throw new TypeError('The study runtime origin must be an exact HTTP(S) origin.');
  const parsed = new URL(value);
  if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || parsed.origin === 'null'
    || parsed.pathname !== '/' || parsed.search || parsed.hash || value !== parsed.origin) {
    throw new TypeError('The study runtime origin must be an exact HTTP(S) origin.');
  }
  return parsed.origin;
}

export function validateSameOriginBlobUrl(value, runtimeOrigin) {
  if (typeof value !== 'string' || !value.startsWith('blob:')) {
    throw new TypeError('A local source URL must be a blob URL.');
  }
  const expectedOrigin = normalizeRuntimeOrigin(runtimeOrigin);
  const parsed = new URL(value);
  if (parsed.protocol !== 'blob:' || parsed.origin === 'null' || parsed.origin !== expectedOrigin) {
    throw new TypeError('The local source URL is not same-origin.');
  }
  return value;
}

export async function sha256Hex(file, cryptoApi = globalThis.crypto) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw new TypeError('Select a readable PDF file.');
  }
  if (!cryptoApi?.subtle?.digest) {
    throw new TypeError('This browser cannot verify local source files.');
  }
  const digest = await cryptoApi.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}
