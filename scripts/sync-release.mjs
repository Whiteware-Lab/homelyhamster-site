import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {repository, validateRelease} from './releases.mjs';
const headers = {'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'HomelyHamster-Pages'};
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
async function json(url, customHeaders = headers) {
  const response = await fetch(url,{headers:customHeaders,signal:AbortSignal.timeout(30000)});
  if (!response.ok) throw Error(`Release request failed: HTTP ${response.status}`);
  return response.json();
}
const releases = await json(`https://api.github.com/repos/${repository}/releases?per_page=100`);
// Beta is intentional: GitHub's /latest endpoint excludes prereleases.
const published = releases.filter(item => !item.draft && /^v\d+\.\d+\.\d+-build\.\d+(?:-beta)?$/.test(item.tag_name)).sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at));
const catalog = [];
const platforms = new Set();
for (const release of published) {
  const asset = release.assets.find(item => item.name === 'release.json');
  if (!asset) throw Error(`Missing manifest in ${release.tag_name}`);
  const manifest = validateRelease(await json(asset.browser_download_url, {'User-Agent':'HomelyHamster-Pages'}));
  if (manifest.tag !== release.tag_name || (manifest.channel === 'beta') !== release.prerelease) throw Error('Release/manifest mismatch');
  for (const item of manifest.artifacts) {
    if (!release.assets.some(asset => asset.name === item.name && asset.size === item.bytes)) throw Error(`Missing or truncated ${item.name}`);
  }
  if (!release.assets.some(item => item.name === 'SHA256SUMS.txt')) throw Error('Missing checksums');
  catalog.push(manifest);
  manifest.artifacts.forEach(item => platforms.add(item.platform));
  if (platforms.size === 2) break;
}
await writeFile(resolve(import.meta.dirname,'../assets/release.json'),JSON.stringify(catalog,null,2)+'\n');
console.log(catalog.length ? `Downloads: ${catalog.map(item=>item.tag).join(', ')}` : 'No public binaries yet');
