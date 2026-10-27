import {cp, mkdir, rm, readFile, writeFile} from 'node:fs/promises';
import {renderDownloads} from './releases.mjs';
import {resolve, dirname, basename} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const output=resolve(root,'dist');
if(dirname(output)!==root || basename(output)!=='dist') throw Error('Invalid build output');
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
// Explicit public-file allowlist: no repository metadata, tests, app or secrets.
for(const item of ['index.html','404.html','.nojekyll','assets','guida','privacy','elimina-account','sitemap.xml','robots.txt']) {
  await cp(resolve(root,item),resolve(output,item),{recursive:true});
}
const release=JSON.parse(await readFile(resolve(root,'assets/release.json'),'utf8'));
const homepage=await readFile(resolve(output,'index.html'),'utf8');
const start='<!-- downloads:start -->', end='<!-- downloads:end -->';
if (!homepage.includes(start) || !homepage.includes(end)) throw Error('Missing downloads slot');
await writeFile(resolve(output,'index.html'),homepage.slice(0,homepage.indexOf(start)+start.length)+renderDownloads(release)+homepage.slice(homepage.indexOf(end)));
console.log('Static site built in dist/');
