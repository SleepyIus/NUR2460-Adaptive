// Keep the already published root artifact while separately checking its source build.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'checkpoint/release.json')));
assert.equal(crypto.createHash('sha256').update(html).digest('hex'),manifest.originalHtmlSha256,'Refuse to snapshot a changed original page');
fs.writeFileSync(path.join(root,'.checkpoint-original.html'),html);
console.log('Frozen published root HTML preserved for checkpoint-only packaging.');
