import {cp, mkdir, rm} from 'node:fs/promises';
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
console.log('Static site built in dist/');
