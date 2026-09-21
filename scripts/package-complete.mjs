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
// The former main app survives at an archive route. Only its navigation changes.
assert.equal(sha(Buffer.from(html)),'6f1c65c620fbe2c5f2463f5da619b68e09dbca2a90bef4636a77600eaa72b475');
const archive=html.replace('href="earlier/">Original quiz ↗','href="../">Original quiz ↗').replace('href="earlier/study-checkpoint/">Study checkpoint ↗','href="../study-checkpoint/">Study checkpoint ↗').replace('<summary>Earlier versions</summary>','<summary>Earlier versions</summary><a href="../../">Return to current quiz ↗</a>');
const expanded=JSON.parse(read('dist/expanded/release.json'));
assert.equal(expanded.questions,445);
assert.equal(sha(read('dist/expanded/index.html')),expanded.htmlSha256);
const redirect=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="canonical" href="../"><link rel="icon" href="../icons/favicon.svg"><title>NUR2460 · Opening your quiz</title><style>body{font:1.125rem/1.6 system-ui,sans-serif;max-width:38rem;margin:4rem auto;padding:0 1.5rem;color:#203448;background:#f3f7f6}a{color:#09695f}a:focus-visible{outline:3px solid #203448;outline-offset:5px}</style></head><body><main><h1>Opening the current quiz</h1><p>Your shared link still works. The quiz and its saved progress are now at the main homepage.</p><p><a id="continue" href="../">Continue to the quiz</a></p><noscript><p>Use the link above to continue. The interactive quiz requires JavaScript.</p></noscript></main><script>const destination=new URL('../',location.href);destination.search=location.search;destination.hash=location.hash;document.getElementById('continue').href=destination.href;location.replace(destination.href);</script></body></html>
`;
const aliasRelease={schema:'exam2-route-alias-1',version:expanded.version,questions:445,hard80Questions:80,canonicalEntry:'../',redirect:true,htmlSha256:sha(Buffer.from(redirect)),targetHtmlSha256:expanded.htmlSha256,saveIsolation:expanded.saveIsolation};
const archiveRelease={...release,status:'archived app; older saved progress retained',htmlSha256:sha(Buffer.from(archive)),canonicalEntry:'earlier/complete/',legacyMigration:false};
const files=new Map([
 ['index.html',read('dist/expanded/index.html')],['release.json',read('dist/expanded/release.json')],
 ['study-checkpoint/index.html',Buffer.from(redirect)],['study-checkpoint/release.json',Buffer.from(JSON.stringify(aliasRelease,null,2)+'\n')],
 ['earlier/complete/index.html',Buffer.from(archive)],['earlier/complete/release.json',Buffer.from(JSON.stringify(archiveRelease,null,2)+'\n')],
 ['earlier/index.html',read('dist/index.html')],['earlier/study-checkpoint/index.html',read('dist/study-checkpoint/index.html')],['earlier/study-checkpoint/release.json',read('dist/study-checkpoint/release.json')]
]);
// Publish the lecture-focused preview as a separate route without replacing the
// current 445-question homepage or its shared checkpoint alias.
const lectureSource=path.join(root,'lecture-focused');
const lectureRelease=JSON.parse(fs.readFileSync(path.join(lectureSource,'release.json')));
assert.equal(lectureRelease.questions,242);
assert.equal(lectureRelease.mainRoutePreserved,true);
assert.equal(lectureRelease.hard80Enabled,false);
const walkSource=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walkSource(path.join(d,e.name)):[path.relative(lectureSource,path.join(d,e.name)).replaceAll(path.sep,'/')]);
for(const relative of walkSource(lectureSource)){
 const bytes=fs.readFileSync(path.join(lectureSource,relative));
 files.set(`lecture-focused/${relative}`,bytes);
}
for(const name of ['favicon.svg','favicon.ico','apple-touch-icon.png']){
 files.set('icons/'+name,read('dist/expanded/icons/'+name));
 files.set('study-checkpoint/icons/'+name,read('dist/expanded/icons/'+name));
 files.set('earlier/complete/icons/'+name,read('dist/study/icons/'+name));
 files.set('earlier/study-checkpoint/icons/'+name,read('dist/study-checkpoint/icons/'+name));
}
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
console.log(JSON.stringify({version:expanded.version,questions:expanded.questions,hard80Questions:expanded.hard80Questions,htmlSha256:expanded.htmlSha256,output:'dist/site',files:[...files].map(([file,bytes])=>({file,bytes:bytes.length,sha256:sha(bytes)})),earlierAppsUnchanged:true},null,2));
