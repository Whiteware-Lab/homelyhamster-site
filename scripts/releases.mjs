// Shared validation for local publishing and the Pages build. No credentials here.
export const repository = 'Whiteware-Lab/homelyhamster-site';
export function validateRelease(value) {
  if (!value || value.schemaVersion !== 1 || !/^\d+\.\d+\.\d+$/.test(value.version) || !Number.isSafeInteger(value.build) || value.build < 1 || !['beta','stable'].includes(value.channel)) throw Error('Invalid release identity');
  const tag = `v${value.version}-build.${value.build}${value.channel === 'beta' ? '-beta' : ''}`;
  if (value.tag !== tag || !Number.isFinite(Date.parse(value.publishedAt))) throw Error('Invalid release tag/date');
  if (!Array.isArray(value.artifacts) || !value.artifacts.length || value.artifacts.length > 2) throw Error('Missing release artifacts');
  const platforms = new Set();
  for (const asset of value.artifacts) {
    const extension = {android:'apk',windows:'zip'}[asset.platform];
    const expected = `homelyhamster-${value.version}-build.${value.build}-${asset.platform}.${extension}`;
    if (!extension || platforms.has(asset.platform) || asset.name !== expected || !/^[a-f0-9]{64}$/.test(asset.sha256) || !Number.isSafeInteger(asset.bytes) || asset.bytes < 1) throw Error('Invalid artifact');
    platforms.add(asset.platform);
  }
  return value;
}
export function assetUrl(release, name) {
  return `https://github.com/${repository}/releases/download/${encodeURIComponent(release.tag)}/${encodeURIComponent(name)}`;
}
const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
export function renderDownloads(releases) {
  if (!Array.isArray(releases)) throw Error('Invalid release catalog');
  releases.forEach(validateRelease);
  return ['android','windows'].map(platform => {
    const release = releases.find(item => item.artifacts.some(asset => asset.platform === platform));
    const asset = release?.artifacts.find(item => item.platform === platform);
    const name = platform === 'android' ? 'Android' : 'Windows';
    const description = platform === 'android' ? 'APK da installare manualmente sul telefono.' : 'ZIP per Windows x64. Estrai tutta la cartella e avvia l’app.';
    const metadata = asset ? `<p class="release-meta">Versione <strong>${escape(release.version)}</strong> · build ${release.build} · ${release.channel === 'beta' ? 'Beta' : 'Stabile'}<br>${escape(new Date(release.publishedAt).toLocaleDateString('it-IT',{timeZone:'UTC'}))} · ${(asset.bytes / 1048576).toFixed(1).replace('.',',')} MB</p>` : '<p class="release-meta">Download non ancora disponibile.</p>';
    const action = asset ? `<a class="button${platform === 'windows' ? ' button-light' : ''}" href="${assetUrl(release,asset.name)}">Scarica per ${name} <span aria-hidden="true">↓</span></a><p class="small-note"><a href="https://github.com/${repository}/releases/tag/${encodeURIComponent(release.tag)}">Note della release</a> · <a href="${assetUrl(release,'SHA256SUMS.txt')}">Checksum SHA-256</a></p>` : '<a class="text-link" href="mailto:filippo.bianchi.85x@gmail.com?subject=Homely%20Hamster%20beta">Chiedi informazioni ↗</a>';
    return `<article><span class="platform-icon" aria-hidden="true">${platform === 'android' ? '↗' : '⊞'}</span><h3>${name}</h3><p>${description}</p>${metadata}${action}</article>`;
  }).join('');
}
