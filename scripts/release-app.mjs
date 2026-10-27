// Builds private app sources locally; publishes only explicitly packaged binaries.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync} from 'node:fs';
import {resolve, join, basename} from 'node:path';
import {repository, validateRelease} from './releases.mjs';

const [command, ...arguments_] = process.argv.slice(2);
const options = {};
for (let i=0; i<arguments_.length; i++) {
  const key = arguments_[i];
  if (key === '--skip-checks') options.skipChecks = true;
  else if (['--app-dir','--platform','--bundle','--notes','--channel'].includes(key) && arguments_[i+1] && !arguments_[i+1].startsWith('--')) options[key.slice(2)] = arguments_[++i];
  else throw Error(`Unknown or incomplete option: ${key}`);
}
const run = (program,args,cwd,extra={}) => execFileSync(program,args,{cwd,stdio:'inherit',...extra});
const gh = (...args) => execFileSync('gh',args,{encoding:'utf8'}).trim();
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const save = (file,value) => writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const siteRoot = resolve(import.meta.dirname,'..');

if (command === 'prepare') {
  if (process.platform !== 'win32') throw Error('This local builder requires Windows and its Flutter/Android toolchains');
  const app = resolve(options['app-dir'] || resolve(siteRoot,'../..'));
  const platforms = {windows:['windows'],android:['android'],all:['android','windows']}[options.platform || 'all'];
  if (!platforms) throw Error('--platform must be windows, android or all');
  const channel = options.channel || 'beta';
  if (!['beta','stable'].includes(channel)) throw Error('Invalid channel');
  const versionMatch = readFileSync(join(app,'pubspec.yaml'),'utf8').match(/^version:\s*(\d+\.\d+\.\d+)\+(\d+)\s*$/m);
  if (!versionMatch) throw Error('pubspec.yaml must contain version: x.y.z+build');
  const version=versionMatch[1], build=Number(versionMatch[2]);
  const tag=`v${version}-build.${build}${channel === 'beta' ? '-beta' : ''}`;
  const output=join(app,'build','releases',tag);
  if (existsSync(output)) throw Error(`Bundle already exists: ${output}. Use a new build number; existing bundles are never overwritten.`);
  if (platforms.includes('android') && !existsSync(join(app,'android/key.properties'))) throw Error('Android release signing missing: configure android/key.properties and the private keystore. Debug APKs are never published. Use --platform windows to release Windows separately.');
  const flutter = args => run('cmd.exe',['/d','/s','/c',`flutter ${args.join(' ')}`],app);
  if (!options.skipChecks) {flutter(['analyze']); flutter(['test']);}
  for (const platform of platforms) flutter(['build',platform === 'android' ? 'apk' : 'windows','--release',`--build-name=${version}`,`--build-number=${build}`]);
  mkdirSync(output,{recursive:true});
  const artifacts=[];
  for (const platform of platforms) {
    const name=`homelyhamster-${version}-build.${build}-${platform}.${platform === 'android' ? 'apk' : 'zip'}`;
    const destination=join(output,name);
    if (platform === 'android') cpSync(join(app,'build/app/outputs/flutter-apk/app-release.apk'),destination);
    else {
      const runner=join(app,'build/windows/x64/runner/Release');
      if (!existsSync(join(runner,'data/app.so')) || !existsSync(join(runner,'homely_hamster_mobile.exe'))) throw Error('Missing Windows release runtime/AOT executable');
      run('powershell.exe',['-NoProfile','-NonInteractive','-Command',"$ErrorActionPreference='Stop'; $version=(Get-Item -LiteralPath $env:HH_RELEASE_EXE).VersionInfo.ProductVersion; if ($version -ne $env:HH_RELEASE_VERSION) { throw 'Executable version does not match release manifest' }"],app,{env:{...process.env,HH_RELEASE_EXE:join(runner,'homely_hamster_mobile.exe'),HH_RELEASE_VERSION:`${version}+${build}`}});
      const stage=join(output,'windows');
      mkdirSync(stage);
      for (const name of readdirSync(runner)) {
        if (name === 'data' || name === 'native_assets.json' || /\.(exe|dll)$/i.test(name)) cpSync(join(runner,name),join(stage,name),{recursive:true});
      }
      writeFileSync(join(stage,'LEGGIMI.txt'),`Homely Hamster ${version} (build ${build}) - ${channel}\r\n\r\nWindows x64: estrai tutta la cartella e avvia homely_hamster_mobile.exe.\r\nConserva le DLL e la cartella data accanto all'eseguibile.\r\nGuida: https://whiteware-lab.github.io/homelyhamster-site/guida/\r\nPacchetto portabile non firmato digitalmente. Nessun aggiornamento automatico.\r\n`);
      run('powershell.exe',['-NoProfile','-NonInteractive','-Command',"$ErrorActionPreference='Stop'; $items=Get-ChildItem -LiteralPath $env:HH_RELEASE_STAGE; Compress-Archive -LiteralPath $items.FullName -DestinationPath $env:HH_RELEASE_ZIP"],app,{env:{...process.env,HH_RELEASE_STAGE:stage,HH_RELEASE_ZIP:destination}});
    }
    artifacts.push({platform,name,bytes:statSync(destination).size,sha256:hash(destination)});
  }
  const manifest=validateRelease({schemaVersion:1,version,build,channel,tag,publishedAt:new Date().toISOString(),artifacts});
  save(join(output,'release.json'),manifest);
  writeFileSync(join(output,'SHA256SUMS.txt'),artifacts.map(item=>`${item.sha256}  ${item.name}`).join('\n')+'\n');
  // Provenance stays local: never upload this file or private source differences.
  const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:app,encoding:'utf8'}).trim();
  const dirty=!!execFileSync('git',['status','--porcelain'],{cwd:app,encoding:'utf8'}).trim();
  save(join(output,'local-provenance.json'),{revision,dirty,checks:options.skipChecks ? 'run separately by operator' : 'flutter analyze + flutter test',preparedAt:new Date().toISOString()});
  console.log(`Prepared ${output}\nReview the binaries and public release notes, then run publish --bundle <path> --notes <file>.`);
} else if (command === 'publish') {
  if (!options.bundle || !options.notes) throw Error('publish requires --bundle and --notes');
  const bundle=resolve(options.bundle), notes=resolve(options.notes);
  if (!readFileSync(notes,'utf8').trim()) throw Error('Release notes cannot be empty');
  const manifest=validateRelease(JSON.parse(readFileSync(join(bundle,'release.json'),'utf8')));
  for (const item of manifest.artifacts) {
    const path=join(bundle,item.name);
    if (statSync(path).size !== item.bytes || hash(path) !== item.sha256) throw Error(`Checksum/size mismatch: ${item.name}`);
  }
  const sums=manifest.artifacts.map(item=>`${item.sha256}  ${item.name}`).join('\n')+'\n';
  if (readFileSync(join(bundle,'SHA256SUMS.txt'),'utf8') !== sums) throw Error('Invalid SHA256SUMS.txt');
  // Refuse an existing tag, including drafts. Never replace a published binary.
  const releases=JSON.parse(gh('api',`repos/${repository}/releases?per_page=100`));
  if (releases.some(item=>item.tag_name === manifest.tag)) throw Error('Release already exists. Use a new build number, or inspect/recover the draft manually.');
  const assets=[...manifest.artifacts.map(item=>join(bundle,item.name)),join(bundle,'release.json'),join(bundle,'SHA256SUMS.txt')];
  const args=['release','create',manifest.tag,'--repo',repository,'--target','main','--draft','--title',`Homely Hamster ${manifest.version} · build ${manifest.build}${manifest.channel === 'beta' ? ' · Beta' : ''}`,'--notes-file',notes,...assets];
  if (manifest.channel === 'beta') args.push('--prerelease');
  run('gh',args,siteRoot);
  const uploaded=JSON.parse(gh('release','view',manifest.tag,'--repo',repository,'--json','assets'));
  for (const file of assets) if (!uploaded.assets.some(item=>item.name === basename(file) && item.size === statSync(file).size)) throw Error('Upload incomplete: release remains a draft');
  run('gh',['release','edit',manifest.tag,'--repo',repository,'--draft=false'],siteRoot);
  console.log(`Published https://github.com/${repository}/releases/tag/${manifest.tag}`);
} else {
  throw Error('Usage: node scripts/release-app.mjs prepare --app-dir <private checkout> --platform windows|android|all [--channel beta|stable] [--skip-checks]\n       node scripts/release-app.mjs publish --bundle <prepared folder> --notes <public markdown file>');
}
