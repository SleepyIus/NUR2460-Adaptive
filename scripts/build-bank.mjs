import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'content',name),'utf8'));
const pilot=read('pilot-base.json'),old=read('exam-base.json');
const topics={
 Pregnancy:{label:'High-risk pregnancy',count:15,sata:5,skills:['Care management','Teaching','Priority','Safety','Pharmacology']},
 Labor:{label:'High-risk labor & delivery',count:15,sata:5,skills:['Care management','Interprofessional collaboration','Teaching','Priority','Safety','Pharmacology']},
 Newborn:{label:'High-risk newborn',count:15,sata:5,skills:['Assessment','Care management','Pharmacology','Interprofessional collaboration','Priority','Safety']},
 GYN:{label:'GYN, infertility, contraception & STI',count:15,sata:4,skills:['Assessment','Care management','Pharmacology','Priority','Safety','Therapeutic communication','Teaching']},
 Growth:{label:'Growth & development',count:10,sata:3,skills:['Assessment','Priority','Safety','Care management']},
 Skin:{label:'Integumentary',count:5,sata:1,skills:['Assessment','Care management','Pharmacology']},
 GI:{label:'Gastrointestinal disorders',count:5,sata:1,skills:['Assessment','Care management','Pharmacology','Priority','Safety']}
};
const areas={...pilot.areas,
 labor_medications:'L&D · Medication safety',labor_assessment:'L&D · Assessment & procedures',labor_surgery:'L&D · Operative birth & recovery',labor_emergencies:'L&D · Emergencies',
 newborn_stability:'Newborn · Physiologic stability',newborn_trauma:'Newborn · Trauma & bilirubin',newborn_congenital:'Newborn · Congenital conditions',newborn_family:'Newborn · Family & ongoing care',
 gyn_contraception:'GYN · Contraception',gyn_infection:'GYN · Infection',gyn_assessment:'GYN · Assessment & communication',gyn_fertility:'GYN · Fertility',gyn_breast:'GYN · Breast care',
 growth_infant:'Growth · Infants',growth_toddler:'Growth · Toddlers',growth_preschool:'Growth · Preschool',growth_school:'Growth · School age',growth_adolescent:'Growth · Adolescents',growth_safety:'Growth · Assessment & safety',
 skin_infection:'Skin · Infection',skin_dermatitis:'Skin · Dermatitis & medications',skin_burns:'Skin · Burns & wounds',
 gi_motility:'GI · Motility',gi_emergency:'GI · Emergencies & poisoning',gi_nutrition:'GI · Nutrition & hydration'
};
const note={Pregnancy:'Week 4 Exam 2 High Risk Pregnancy Instructor Notes',Labor:'Week 5 Exam 2 HR Labor and Delivery Instructor Notes',Newborn:'Week 5 Exam 2 HR Newborn Instructor Notes',GYN:'Week 6 Exam 2 GYN, Infertility and STI Instructor Notes',Growth:'Week 6 Exam 2 Healthy Child Growth and Development Instructor Notes',Skin:'Week 7 Exam 2 Integumentary Instructor Notes',GI:'Week 7 Exam 2 GI Instructor Notes'};
const decks={Pregnancy:'Week 4 High Risk Pregnancy lecture',Labor:'Week 5 HR Labor and Delivery lecture',Newborn:'Week 5 HR Newborn lecture',GYN:'Week 6 GYN, STIs, and Infertility lecture',Skin:'Week 7 Children & Integumentary lecture',GI:'Week 7 GI Dysfunction lecture'};
const web={
 C1:['CDC · Pregnancy vaccination','https://www.cdc.gov/vaccines-pregnancy/hcp/vaccination-guidelines/index.html'],
 C2:['ACOG · Fetal heart rate monitoring, 2025','https://obgyn.wustl.edu/app/uploads/2025/09/acog_clinical_practice_guideline_no_.22.pdf'],
 C3:['AAP · Hyperbilirubinemia guideline, 2022 (at least 35 weeks)','https://publications.aap.org/pediatrics/article/150/3/e2022058859/188726/Clinical-Practice-Guideline-Revision-Management-of'],
 C4:['CDC · Combined hormonal contraceptive eligibility','https://www.cdc.gov/contraception/hcp/usmec/combined-hormonal-contraceptives.html'],
 C5:['CDC · Combined hormonal contraceptives and missed pills','https://www.cdc.gov/contraception/hcp/usspr/combined-hormonal-contraceptives.html'],
 C6:['CDC · Chlamydia','https://www.cdc.gov/std/treatment-guidelines/chlamydia.htm'],
 C7:['CDC · Candidiasis','https://www.cdc.gov/std/treatment-guidelines/candidiasis.htm'],
 C8:['CDC · Child immunization schedule notes (consult current schedule)','https://www.cdc.gov/vaccines/hcp/imz-schedules/child-adolescent-notes.html'],
 C9:['CDC · Meningococcal vaccine recommendations','https://www.cdc.gov/meningococcal/hcp/vaccine-recommendations/'],
 C10:['CDC · Head lice treatment','https://www.cdc.gov/lice/treatment/index.html'],
 C11:['CDC · Scabies treatment','https://www.cdc.gov/scabies/treatment/index.html'],
 C12:['AAP · Safe sleep for infants with reflux','https://www.healthychildren.org/English/tips-tools/ask-the-pediatrician/Pages/What-is-the-safest-sleep-solution-for-my-baby-with-reflux.aspx'],
 C13:['Poison Control · First aid for poisonings','https://www.poison.org/first-aid-for-poisonings'],
 C14:['ACOG · Preeclampsia and high blood pressure','https://www.acog.org/womens-health/faqs/preeclampsia-and-high-blood-pressure-during-pregnancy'],
 C15:['ASRM · Ovarian hyperstimulation syndrome guideline','https://www.asrm.org/practice-guidance/practice-committee-documents/prevention-of-moderate-and-severe-ovarian-hyperstimulation-syndrome-a-guideline-2023/'],
 CMV:['CDC · CMV exposure prevention','https://www.cdc.gov/cytomegalovirus/about/index.html'],
 NRP:['AHA/AAP · Neonatal resuscitation, 2025 (clinical update)','https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/neonatal-resuscitation'],
 EC:['CDC · Emergency contraception (clinical update)','https://www.cdc.gov/contraception/hcp/usspr/emergency-contraception.html'],
 PID:['CDC · Pelvic inflammatory disease','https://www.cdc.gov/std/treatment-guidelines/pid.htm'],
 SYP:['CDC · Syphilis during pregnancy','https://www.cdc.gov/std/treatment-guidelines/syphilis-pregnancy.htm'],
 TRI:['CDC · Trichomoniasis','https://www.cdc.gov/std/treatment-guidelines/trichomoniasis.htm']
};
const books={AM:'ATI RN Maternal Newborn Nursing, edition 11',AC:'ATI RN Nursing Care of Children, edition 11',AP:'ATI RN Pharmacology for Nursing, edition 8',MC:'Maternal Child Nursing Care, seventh edition, 2022'};
const publicRef=key=>({label:web[key][0],url:web[key][1]});
function refs(topic,section,slide){
 const result=[{label:`${note[topic]} — ${section}.`}];
 if(topic!=='Growth'&&slide!=='notes')result.push({label:`${topic==='GYN'&&section.startsWith('Contraception')?'Week 6 Contraception & Abortion lecture':decks[topic]} — ${slide==='topic'?'related topic':`slide(s) ${slide}`}.`});
 const pediatricCongenital=/cleft|atresia|TEF|myelomeningocele|hydrocephalus|Pavlik|clubfoot|omphalocele|gastroschisis|hip dysplasia/i.test(section);
 const book=topic==='GYN'?books.MC:['Pregnancy','Labor'].includes(topic)||(topic==='Newborn'&&!pediatricCongenital)?books.AM:books.AC;
 result.push({label:`${book} — related ${section.toLowerCase()} content (supplement).`});
 return result;
}
const questions=pilot.questions.map(q=>({...q,topic:'Pregnancy'}));
const legacyAreas={16:'labor_medications',17:'labor_medications',18:'labor_assessment',19:'labor_assessment',20:'labor_surgery',21:'labor_emergencies',22:'labor_emergencies',23:'labor_medications',24:'labor_surgery',25:'labor_surgery',26:'labor_medications',27:'labor_medications',28:'labor_assessment',29:'labor_emergencies',30:'labor_emergencies',31:'newborn_stability',32:'newborn_trauma',33:'newborn_congenital',34:'newborn_stability',35:'newborn_stability',36:'newborn_congenital',37:'newborn_congenital',38:'newborn_congenital',39:'newborn_trauma',40:'newborn_family',41:'newborn_stability',42:'newborn_stability',43:'newborn_trauma',44:'newborn_congenital',45:'newborn_congenital',46:'gyn_contraception',47:'gyn_contraception',48:'gyn_assessment',49:'gyn_breast',50:'gyn_infection',51:'gyn_infection',52:'gyn_infection',53:'gyn_infection',54:'gyn_fertility',55:'gyn_fertility',56:'gyn_assessment',57:'gyn_assessment',58:'gyn_assessment',59:'gyn_fertility',60:'gyn_contraception',61:'growth_safety',62:'growth_infant',63:'growth_infant',64:'growth_infant',65:'growth_toddler',66:'growth_preschool',67:'growth_school',68:'growth_toddler',69:'growth_safety',70:'growth_safety',71:'skin_infection',72:'skin_infection',73:'skin_infection',74:'skin_dermatitis',75:'skin_dermatitis',76:'gi_motility',77:'gi_emergency',78:'gi_emergency',79:'gi_emergency',80:'gi_emergency'};
const sections=['Oxytocin','Magnesium toxicity','Intraamniotic infection','Membrane rupture','Postoperative respiratory safety','Precipitous birth','Cord prolapse','Terbutaline','Operative birth trauma','Discharge warning signs','Betamethasone','Oxytocin calculation','PPROM','Shoulder dystocia','Uterine rupture','Hypoglycemia','Subgaleal hemorrhage','Phenylketonuria','Postterm newborn','Small for gestational age','Myelomeningocele','Hip dysplasia','Hydrocephalus','Pathologic jaundice','Opioid withdrawal','Feeding readiness','Necrotizing enterocolitis','Erb palsy','Cleft repair','Gastroschisis','Contraception contraindications','Contraception missed pills','Adolescent care','Breast surgery','PID','Chlamydia','Bacterial vaginosis','Candidiasis','Semen analysis','Ovulation detection','Abnormal uterine bleeding','Pelvic examination','Dysmenorrhea','Ovarian hyperstimulation','Contraception IUD','Medication calculation','Developmental surveillance','Infant play','Separation anxiety','Toddler care','Preschool thinking','School-age care','Toddler safety','Immunization','Transportation safety','Impetigo','Lice','Scabies','Atopic dermatitis','Psoriasis','Pyloric stenosis','Appendicitis','Intussusception','Hirschsprung disease','Acetaminophen poisoning'];
for(const q of old.filter(q=>q.id>15)){
 const section=sections[q.id-16],reference=refs(q.category,section,'topic');
 for(const key of q.refs){if(web[key])reference.push(publicRef(key));else if(books[key])reference.push({label:books[key]+' — relevant section.'});}
 questions.push({id:`q${q.id}`,topic:q.category,area:legacyAreas[q.id],difficulty:q.domains.includes('Priority')?3:2,kind:q.kind,skills:q.domains,stem:q.stem,clue:q.rationale,rationale:q.rationale,options:q.options.map((o,i)=>({id:`o${i}`,text:o.text,correct:o.correct,reason:o.reason})),refs:reference,origin:`Original PDF question ${q.id}`});
}
for(const chunk of fs.readFileSync(path.join(root,'content/expansion.txt'),'utf8').split('@@ ').slice(1)){
 const lines=chunk.split('\n').map(x=>x.trim()).filter(Boolean);
 const [id,topic,area,level,kind,skills,section,slide]=lines.shift().split('|');
 const q={id,topic,area,difficulty:Number(level),kind,skills:skills.split(', '),stem:lines.shift(),options:[],refs:refs(topic,section,slide),origin:'Original expanded-bank scenario'};
 for(const line of lines){if(line.startsWith('CLUE: '))q.clue=line.slice(6);else if(line.startsWith('WHY: '))q.rationale=line.slice(5);else {if(!/^[+-] /.test(line))throw Error(`Invalid content: ${line}`);const [text,reason]=line.slice(2).split(' || ');q.options.push({id:`o${q.options.length}`,text,correct:line[0]==='+',reason});}}
 questions.push(q);
}
web.CLO=['DailyMed · Clomiphene prescribing information, visual adverse effects','https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=79f64995-7425-44c6-9f44-f7d20daeff65'];
web.GT=['Royal Children’s Hospital · Gastrostomy problems','https://www.rch.org.au/clinicalguide/guideline_index/Gastrostomy_Common_problems/'];
web.HPV=['CDC · HPV and screening','https://www.cdc.gov/std/treatment-guidelines/hpv.htm'];
const updates={e206:['CMV'],e207:['C14'],e248:['NRP'],e249:['NRP'],e270:['EC'],e271:['EC'],e272:['C4'],e275:['C5'],e280:['SYP'],e281:['TRI'],e282:['PID'],e283:['C6'],e285:['HPV'],e295:['CLO'],e304:['C12'],e309:['C8'],e321:['C10'],e322:['C11'],e330:['C12'],e336:['GT'],e337:['C13']};
for(const q of questions)for(const key of updates[q.id]??[])q.refs.push(publicRef(key));
const ids=new Set(),stems=new Set();
for(const q of questions){
 if(ids.has(q.id)||stems.has(q.stem))throw Error(`Duplicate ${q.id}`);ids.add(q.id);stems.add(q.stem);
 const n=q.options.filter(o=>o.correct).length;
 if(!topics[q.topic]||!areas[q.area]||![1,2,3].includes(q.difficulty)||!q.clue||!q.rationale||q.options.some(o=>!o.text||!o.reason)||!(q.kind==='MC'?n===1&&q.options.length===4:q.kind==='SATA'&&n>=2&&n<q.options.length))throw Error(`Invalid item ${q.id}`);
}
if(!process.argv.includes('--draft'))for(const [topic,t] of Object.entries(topics))if(questions.filter(q=>q.topic===topic).length!==t.count*3)throw Error(`Expected ${t.count*3} items in ${topic}`);
const bank={version:'exam2-2.0.0',reviewed:'2026-09-09',topics,areas,questions};
fs.writeFileSync(path.join(root,'data/bank.json'),JSON.stringify(bank,null,2)+'\n');
console.log(JSON.stringify({questions:questions.length,byTopic:Object.fromEntries(Object.keys(topics).map(t=>[t,questions.filter(q=>q.topic===t).length])),formats:Object.fromEntries(['MC','SATA'].map(k=>[k,questions.filter(q=>q.kind===k).length]))},null,2));
