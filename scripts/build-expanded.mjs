// Build the accepted expanded app without changing any earlier app or save identity.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const root=path.resolve(import.meta.dirname,'..');
const read=name=>fs.readFileSync(path.join(root,'expanded',name));
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const bank=JSON.parse(read('bank.json')),weekMapping=JSON.parse(read('week-mapping.json'));
assert.equal(sha(read('bank.json')),'b8da63284f9bc8af08ac3b3520d995cc346926285af6fbb2f1c9ea634414e046');
assert.equal(sha(read('week-mapping.json')),'6a241db16d1d06e79c301748cd0f6744a0caa2fec09449e76a9b6f7f6f3d002a');
assert.equal(bank.questions.length,445);
assert.equal(bank.version,'exam2-coverage-private-3');
const strip=source=>source.toString().replace(/^import[\s\S]*?from ['"][^'"]+['"](?: with \{[^}]+\})?;\n/gm,'').replace(/^export /gm,'');
const data=value=>JSON.stringify(value).replace(/</g,'\\u003c');
const js=strip(read('hard80-selector.mjs'))+'\nconst weekMapping='+data(weekMapping)+';\n'+strip(read('week-mapping.mjs'))+'\n'+strip(read('engine.mjs'))+'\n'+strip(read('hard80.mjs'))+'\n'+strip(read('learning.mjs'))+'\n'+strip(read('learning-view.mjs'))+'\nconst bank='+data(bank)+';\n'+strip(read('app.mjs'));
new vm.Script(js);
const svgUrl='data:image/svg+xml;base64,'+read('icons/favicon.svg').toString('base64');
const html='<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#09695f"><meta name="description" content="445 original NUR2460 Exam 2 practice questions, week-filtered adaptive study, rationales, and an exact Hard 80 exam. Educational practice; not official ATI or NCLEX material."><title>NUR2460 · Exam 2 Expanded</title><link rel="icon" type="image/svg+xml" href="icons/favicon.svg"><link rel="icon" href="icons/favicon.ico" sizes="any"><link rel="apple-touch-icon" href="icons/apple-touch-icon.png"><style>'+read('styles.css')+'</style></head><body><div id="app"></div><noscript>This interactive study quiz requires JavaScript.</noscript><script>'+js.replace('src="icons/favicon.svg"','src="'+svgUrl+'"').replace(/<\/script/gi,'<\\/script')+'</script></body></html>\n';
for(const pattern of [/\/Users\//u,/file:\/\//u,/reviews\//u,/private-candidates\//u,/input-manifest/iu,/Source-Evidence\.json/iu,/"(?:sourceSha256|claimId|locator|lineStart|lineEnd)"\s*:/u,/gh[opsu]_[A-Za-z0-9]{16}/u,/localhost:\d+/u])assert(!pattern.test(html),'Private detail in public HTML: '+pattern);
assert(!/<script[^>]+src=|<link[^>]+rel=["']stylesheet|@import\s/iu.test(html),'Unexpected runtime dependency');
assert(!/^import |^export /m.test(js),'Unbundled module');
const output=path.join(root,'dist/expanded');fs.mkdirSync(path.join(output,'icons'),{recursive:true});
fs.writeFileSync(path.join(output,'index.html'),html);
const assets={};for(const name of ['favicon.svg','favicon.ico','apple-touch-icon.png']){const bytes=read('icons/'+name);fs.writeFileSync(path.join(output,'icons',name),bytes);assets[name]=sha(bytes);}
const release={schema:'exam2-expanded-release-1',name:'Exam 2 Expanded 445',version:bank.version,status:'released app; AI-assisted content review, independent educator review pending',questions:445,tracks:Object.keys(bank.tracks).length,bankSha256:sha(read('bank.json')),htmlSha256:sha(html),hard80Questions:80,hard80Quotas:{Pregnancy:15,Labor:15,Newborn:15,GYN:15,Growth:10,Skin:5,GI:5},weekCounts:{All:445,4:79,5:145,6:145,7:76},weekMappingSha256:sha(read('week-mapping.json')),saveIsolation:{studyKey:'nur2460-exam2-coverage-private-3-study',hard80Key:'nur2460-exam2-coverage-private-3-hard80',legacyMigration:false},entrypoint:'./',compatibilityEntry:'study-checkpoint/',earlierEntries:['earlier/complete/','earlier/study-checkpoint/','earlier/'],assets};
fs.writeFileSync(path.join(output,'release.json'),JSON.stringify(release,null,2)+'\n');
console.log(JSON.stringify({expanded:release.name,questions:445,hard80:80,htmlSha256:release.htmlSha256,output:'dist/expanded'}));
