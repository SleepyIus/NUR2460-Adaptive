import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..'),site=path.join(root,'dist/site');
const read=name=>fs.readFileSync(path.join(site,name)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
assert.equal(sha(read('index.html')),'6f1c65c620fbe2c5f2463f5da619b68e09dbca2a90bef4636a77600eaa72b475','Main349 HTML must stay byte-identical');
const main=JSON.parse(read('release.json')),expanded=JSON.parse(read('study-checkpoint/release.json')),earlier=JSON.parse(read('earlier/study-checkpoint/release.json'));
assert.equal(main.questions,349);assert.equal(expanded.questions,445);assert.equal(expanded.hard80Questions,80);
assert.equal(sha(read('study-checkpoint/index.html')),expanded.htmlSha256);
assert.equal(sha(read('earlier/index.html')),earlier.originalHtmlSha256);
assert.equal(sha(read('earlier/study-checkpoint/index.html')),earlier.htmlSha256);
const html=read('study-checkpoint/index.html').toString();
assert(!html.includes('location.replace('));assert(html.includes('Exam 2 · Expanded'));
for(const href of ['../','../earlier/','../earlier/study-checkpoint/'])assert(html.includes('href="'+href+'"'),href);
for(const [icon,hash] of Object.entries(expanded.assets))assert.equal(sha(read('study-checkpoint/icons/'+icon)),hash);
for(const source of ['engine.mjs','hard80.mjs','app.mjs']){
 const code=fs.readFileSync(path.join(root,'expanded',source),'utf8');
 assert(!/localStorage\.(?:getItem|setItem|removeItem)\(['"]nur2460-(?:study-weeks-2|complete-hard80-2)['"]/.test(code),'Main save access');
}
console.log(JSON.stringify({status:'PASS',main349HtmlUnchanged:true,expandedQuestions:445,hard80:80,earlierAppsUnchanged:true,expandedHtmlSha256:expanded.htmlSha256,saveIsolation:true}));
