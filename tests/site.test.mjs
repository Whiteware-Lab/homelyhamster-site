import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync, statSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {makeDemoSteps, sampleDemo} from '../assets/demo-model.js';
const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const pages = ['index.html','guida/index.html','privacy/index.html','elimina-account/index.html'];

test('all local links, assets and fragment targets resolve at the project subpath', () => {
  for (const page of pages) {
    const html = read(page);
    for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      const link = match[1];
      if (/^(https?:|mailto:)/.test(link)) continue;
      assert.equal(link.startsWith('/'),false,`${page}: root-relative link ${link}`);
      const [pathname, fragment] = link.split('#');
      let target = resolve(root, dirname(page), decodeURIComponent(pathname || ''));
      if (!pathname) target = resolve(root,page);
      else if (existsSync(target) && statSync(target).isDirectory()) target = resolve(target,'index.html');
      assert.ok(target.startsWith(root), `${page}: escaping path`);
      assert.ok(existsSync(target), `${page}: missing ${link}`);
      if (fragment) assert.ok(readFileSync(target,'utf8').includes(`id="${fragment}"`),`${page}: missing fragment ${link}`);
    }
  }
});
test('pages have one primary heading, descriptions, language, skip link and unique IDs', () => {
  for (const page of pages) {
    const html=read(page);
    assert.match(html,/<html lang="it">/);
    assert.match(html,/<meta name="description" content="[^"]+">/);
    assert.equal([...html.matchAll(/<h1[\s>]/g)].length,1,page);
    assert.match(html,/class="skip-link"/);
    const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(new Set(ids).size,ids.length,page);
  }
});
test('bundled demo preserves six timed occurrences and native ramp/cadence targets', () => {
  const steps=makeDemoSteps(JSON.parse(read('assets/workout-demo.json')));
  assert.equal(steps.length,6);
  assert.deepEqual(steps.map(s=>s.duration),[30,15,15,15,15,30]);
  assert.equal(steps.at(-1).endsAt,120);
  assert.equal(sampleDemo(steps,15).resistance,7.5);
  assert.equal(sampleDemo(steps,30).step.cadence,80);
  assert.equal(sampleDemo(steps,45).step.name,'Recupero');
  assert.equal(sampleDemo(steps,120).resistance,0);
  assert.equal(sampleDemo(steps,120).complete,true);
});
test('preview handles boundaries, skipping to leaf end and restart sampling', () => {
  const steps=makeDemoSteps(JSON.parse(read('assets/workout-demo.json')));
  const work=sampleDemo(steps,33);
  assert.equal(sampleDemo(steps,work.step.endsAt).step.name,'Recupero');
  assert.equal(sampleDemo(steps,-5).elapsed,0);
  assert.equal(sampleDemo(steps,900).elapsed,120);
  assert.equal(sampleDemo(steps,0).step.name,'Riscaldamento');
});
test('public site requests no credentials and embeds no tracking or external resources', () => {
  for (const page of pages) {
    const html=read(page);
    assert.doesNotMatch(html,/<(?:input|form|iframe)\b/i,page);
    assert.doesNotMatch(html,/<(?:script|img)[^>]+src="https?:/i,page);
    assert.doesNotMatch(html,/googletagmanager|google-analytics|client_secret|AIza[\w-]+/i,page);
  }
  const script=read('assets/site.js');
  assert.doesNotMatch(script,/localStorage|sessionStorage|document\.cookie/);
});
