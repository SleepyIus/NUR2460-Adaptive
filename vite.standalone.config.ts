import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import path from 'node:path';
import fs from 'node:fs';
const notices={name:'bundled-license-notices',generateBundle(_options:unknown,bundle:Record<string,any>){
 const packages=new Map<string,string>();
 const moduleIds=Object.values(bundle).filter(output=>output.type==='chunk').flatMap(output=>Object.keys(output.modules));
 moduleIds.push(...['shadcn','@shadcn/react','tailwindcss','tw-animate-css'].map(name=>path.resolve(import.meta.dirname,'node_modules',name,'license-entry.js')));
 for(const id of moduleIds){
  if(!id.includes('/node_modules/')||id.startsWith('\0'))continue;
  let dir=path.dirname(id.split('?')[0]);
  while(dir!==path.dirname(dir)){
   const file=path.join(dir,'package.json');
   if(fs.existsSync(file)){
    const pkg=JSON.parse(fs.readFileSync(file,'utf8'));
    const licenses=fs.readdirSync(dir).filter(n=>/^licen[sc]e(?:\.|$)/i.test(n)&&fs.statSync(path.join(dir,n)).isFile());
    if(licenses.length)packages.set(`${pkg.name} ${pkg.version}`,licenses.map(n=>fs.readFileSync(path.join(dir,n),'utf8')).join('\n\n'));
    else packages.set(`${pkg.name} ${pkg.version}`,`License metadata: ${JSON.stringify(pkg.license??'not specified')}. See the installed package for notices.`);
    break;
   }
   dir=path.dirname(dir);
  }
 }
 const text='# Third-party software notices\n\nThese notices concern software included in the standalone browser bundle. They do not license the course materials or original question content.\n\n'+[...packages].sort().map(([name,license])=>`## ${name}\n\n${license}`).join('\n\n');
 fs.writeFileSync(path.resolve(import.meta.dirname,'THIRD_PARTY_NOTICES.md'),text+'\n');
}};
export default defineConfig({
 plugins:[react(),notices],
 resolve:{alias:{'@':path.resolve(import.meta.dirname)}},
 css:{postcss:{plugins:[tailwindcss()]}},
 define:{'process.env.NODE_ENV':JSON.stringify('production')},
 build:{outDir:'dist-html',emptyOutDir:true,cssCodeSplit:false,lib:{entry:path.resolve(import.meta.dirname,'standalone.tsx'),name:'NUR2460Quiz',formats:['iife'],fileName:()=> 'quiz.js'}},
});
