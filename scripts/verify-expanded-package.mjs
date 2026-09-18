import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import vm from 'node:vm';
const root=path.resolve(import.meta.dirname,'..'),site=path.join(root,'dist/site');
const read=name=>fs.readFileSync(path.join(site,name)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const main=JSON.parse(read('release.json')),alias=JSON.parse(read('study-checkpoint/release.json')),earlier=JSON.parse(read('earlier/study-checkpoint/release.json')),archive=JSON.parse(read('earlier/complete/release.json'));
assert.equal(main.questions,445);assert.equal(main.hard80Questions,80);assert.equal(alias.questions,445);assert.equal(alias.redirect,true);assert.equal(archive.questions,349);
assert.equal(sha(read('index.html')),main.htmlSha256);assert.equal(alias.targetHtmlSha256,main.htmlSha256);
assert.equal(sha(read('study-checkpoint/index.html')),alias.htmlSha256);
assert.equal(sha(read('earlier/complete/index.html')),archive.htmlSha256);
const archived=read('earlier/complete/index.html').toString().replace('href="../">Original quiz ↗','href="earlier/">Original quiz ↗').replace('href="../study-checkpoint/">Study checkpoint ↗','href="earlier/study-checkpoint/">Study checkpoint ↗').replace('<a href="../../">Return to current quiz ↗</a>','');
assert.equal(sha(Buffer.from(archived)),'6f1c65c620fbe2c5f2463f5da619b68e09dbca2a90bef4636a77600eaa72b475','Only archive navigation may differ from old main349');
assert.equal(sha(read('earlier/index.html')),earlier.originalHtmlSha256);
assert.equal(sha(read('earlier/study-checkpoint/index.html')),earlier.htmlSha256);
const html=read('index.html').toString();
assert(!html.includes('location.replace('));assert(html.includes('Exam 2 · Expanded'));
assert(!html.includes('Other versions'));assert(html.includes('Find older saved progress'));
assert.equal(main.studyScopes.blueprint,414);assert.equal(main.studyScopes.blueprintGyn,52);assert.equal(main.studyScopes.hard80Unaffected,true);
assert(html.includes('id="study-scope"'));assert(html.includes('Blueprint-only topics'));assert(html.includes('Full course coverage'));
for(const href of ['earlier/complete/','earlier/','earlier/study-checkpoint/'])assert(html.includes('href="'+href+'"'),href);
const classicLink='<a href="earlier/" target="_blank" rel="noopener">Original quiz (classic layout) ↗</a>';
assert(html.includes(classicLink),'Visible classic-layout link targets the original252 archive in a separate tab');
assert(html.indexOf(classicLink)<html.indexOf('<details class="about">'),'Classic link is outside the collapsed About section');
assert(read('earlier/index.html').toString().includes('15-question study'),'Classic target matches the original study interface');
for(const [icon,hash] of Object.entries(main.assets))for(const prefix of ['icons/','study-checkpoint/icons/','earlier/complete/icons/'])assert.equal(sha(read(prefix+icon)),hash);
const redirectHtml=read('study-checkpoint/index.html').toString(),redirectJs=redirectHtml.match(/<script>([\s\S]*?)<\/script>/)[1];
assert(redirectHtml.includes('<noscript>'));assert(!redirectHtml.includes('localStorage'));
for(const route of ['study-checkpoint/','study-checkpoint/index.html','study-checkpoint/?shared=friend#main','study-checkpoint/index.html?week=7#resume']){
 const href='https://sleepyius.github.io/NUR2460-Adaptive/'+route,url=new URL(href),anchor={};let destination;
 vm.runInNewContext(redirectJs,{URL,location:{href,search:url.search,hash:url.hash,replace:value=>{destination=value;}},document:{getElementById:id=>{assert.equal(id,'continue');return anchor;}}});
 assert.equal(destination,'https://sleepyius.github.io/NUR2460-Adaptive/'+url.search+url.hash);assert.equal(anchor.href,destination);
}
assert.deepEqual(alias.saveIsolation,main.saveIsolation);
for(const source of ['engine.mjs','hard80.mjs','app.mjs']){
 const code=fs.readFileSync(path.join(root,'expanded',source),'utf8');
 assert(!/localStorage\.(?:getItem|setItem|removeItem)\(['"]nur2460-(?:study-weeks-2|complete-hard80-2)['"]/.test(code),'Main save access');
}
console.log(JSON.stringify({status:'PASS',canonicalQuestions:445,hard80:80,sharedLinkRedirectCases:4,archive349OnlyNavigationChanged:true,earlierAppsUnchanged:true,canonicalHtmlSha256:main.htmlSha256,saveIsolation:true}));
