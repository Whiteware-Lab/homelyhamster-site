import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRelease,renderDownloads} from '../scripts/releases.mjs';
const fixture=(platform='windows',build=11)=>({schemaVersion:1,version:'1.0.10',build,channel:'beta',tag:`v1.0.10-build.${build}-beta`,publishedAt:'2026-10-27T12:00:00Z',artifacts:[{platform,name:`homelyhamster-1.0.10-build.${build}-${platform}.${platform === 'android' ? 'apk' : 'zip'}`,bytes:10485760,sha256:'a'.repeat(64)}]});
test('metadata rejects mismatched versions, unsafe asset names, duplicate platforms and absent checksums',()=>{
  assert.equal(validateRelease(fixture()).build,11);
  for (const modify of [r=>r.tag='v1.0.9',r=>r.artifacts[0].name='../secret.zip',r=>r.artifacts[0].sha256='',r=>r.artifacts.push({...r.artifacts[0]}),r=>r.artifacts[0].bytes=-1,r=>r.publishedAt='bad']) {
    const value=fixture(); modify(value); assert.throws(()=>validateRelease(value));
  }
});
test('downloads keep the latest available version for each platform independently',()=>{
  const html=renderDownloads([fixture('windows',12),fixture('android',10),fixture('windows',9)]);
  assert.match(html,/build 12/); assert.match(html,/build 10/); assert.doesNotMatch(html,/build 9/);
  assert.match(html,/releases\/download\/v1.0.10-build.12-beta\/homelyhamster-1.0.10-build.12-windows.zip/);
  assert.match(html,/releases\/download\/v1.0.10-build.10-beta\/homelyhamster-1.0.10-build.10-android.apk/);
  assert.match(html,/10,0 MB/); assert.match(html,/SHA256SUMS.txt/);
});
test('an unpublished platform has no invented download or version',()=>{
  assert.equal((renderDownloads([]).match(/Download non ancora disponibile/g)||[]).length,2);
  const html=renderDownloads([fixture()]);
  assert.match(html,/Scarica per Windows/); assert.doesNotMatch(html,/Scarica per Android/);
});
