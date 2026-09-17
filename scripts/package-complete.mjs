// Package only the reviewed static app and recoverable earlier versions.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const release=JSON.parse(read('dist/study/release.json'));
const checkpoint=JSON.parse(read('dist/study-checkpoint/release.json'));
assert.equal(release.version,'exam2-complete-1.1.1');
assert.equal(release.bankSha256,'ab56b8d1a491a9fe3f41906277e086a02018a062bb1af86d8eec2715b69f8716');
assert.equal(sha(read('dist/study/index.html')),release.htmlSha256);
assert.equal(sha(read('dist/index.html')),checkpoint.originalHtmlSha256);
assert.equal(sha(read('dist/study-checkpoint/index.html')),checkpoint.htmlSha256);
let html=read('dist/study/index.html').toString();
for(const [before,after] of [
 ['href="../">Original quiz ↗','href="earlier/">Original quiz ↗'],
 ['href="../study-checkpoint/">Study checkpoint ↗','href="earlier/study-checkpoint/">Study checkpoint ↗'],
 ['Exam 2 · Complete private candidate','Exam 2 · Complete'],
 ['About this private candidate & progress','About this quiz & progress'],
 ['This private successor contains 349','This quiz contains 349'],
 ['Private integrated successor pending independent combined QA. No publication approval.','AI-assisted content review; independent nursing-educator review pending.'],
]){assert.equal(html.split(before).length-1,1,before);html=html.replace(before,after);}
const files=new Map([['index.html',Buffer.from(html)],['study-checkpoint/index.html',read('dist/expanded/index.html')],['study-checkpoint/release.json',read('dist/expanded/release.json')],['earlier/index.html',read('dist/index.html')],['earlier/study-checkpoint/index.html',read('dist/study-checkpoint/index.html')],['earlier/study-checkpoint/release.json',read('dist/study-checkpoint/release.json')]]);
for(const name of ['favicon.svg','favicon.ico','apple-touch-icon.png']){
 files.set('icons/'+name,read('dist/study/icons/'+name));
 files.set('study-checkpoint/icons/'+name,read('dist/expanded/icons/'+name));
 files.set('earlier/study-checkpoint/icons/'+name,read('dist/study-checkpoint/icons/'+name));
}
const publicRelease={...release,status:'released app; AI-assisted content review, independent educator review pending',candidateHtmlSha256:release.htmlSha256,htmlSha256:sha(Buffer.from(html)),canonicalEntry:'./',expandedEntry:'study-checkpoint/',earlierEntries:['earlier/','earlier/study-checkpoint/'],legacyMigration:false};
files.set('release.json',Buffer.from(JSON.stringify(publicRelease,null,2)+'\n'));
const output=path.join(root,'dist/site');fs.mkdirSync(output,{recursive:true});
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.relative(output,path.join(d,e.name)).replaceAll(path.sep,'/')]);
for(const existing of walk(output))assert(files.has(existing),'Unapproved stale public file: '+existing);
for(const [name,bytes] of files){
 if(name.endsWith('.html')){
  const text=bytes.toString();assert(!/\/Users\/|private-candidates\/|reviews\/parallel-planning\/|file:\/\//.test(text),name+' private path');
  for(const match of text.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
 }
 const target=path.join(output,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
}
assert.equal(sha(read('dist/site/earlier/index.html')),checkpoint.originalHtmlSha256);
assert.equal(sha(read('dist/site/earlier/study-checkpoint/index.html')),checkpoint.htmlSha256);
console.log(JSON.stringify({version:release.version,questions:release.questions,hard80Questions:release.hard80Questions,htmlSha256:publicRelease.htmlSha256,output:'dist/site',files:[...files].map(([file,bytes])=>({file,bytes:bytes.length,sha256:sha(bytes)})),earlierAppsUnchanged:true},null,2));
