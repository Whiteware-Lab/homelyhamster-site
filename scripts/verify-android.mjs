import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';

export function checkAndroidIdentity(badging,signing,version,build,oauthClients) {
  const identity=badging.match(/^package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/m);
  if (!identity || identity[1] !== 'com.whitewarelab.homelyhamster' || Number(identity[2]) !== build || identity[3] !== version || /^application-debuggable/m.test(badging)) throw Error('APK package/version mismatch or debuggable APK');
  if (/Android Debug/i.test(signing) || !/Verified using v[23](?:\.\d+)? scheme[^\n]*: true/.test(signing)) throw Error('APK must have a release certificate and a valid v2/v3 signature');
  const sha1=signing.match(/^Signer #1 certificate SHA-1 digest: ([a-fA-F0-9]+)$/m)?.[1]?.toLowerCase();
  const sha256=signing.match(/^Signer #1 certificate SHA-256 digest: ([a-fA-F0-9]+)$/m)?.[1]?.toLowerCase();
  if (!sha1 || !sha256 || !oauthClients.some(item=>item.client_type === 1 && item.android_info?.package_name === identity[1] && item.android_info.certificate_hash?.toLowerCase() === sha1)) throw Error('Signing certificate is missing from the Firebase Google OAuth Android configuration');
  return {sha1,sha256};
}
export function verifyAndroid(app,apk,version,build) {
  const properties=readFileSync(join(app,'android/local.properties'),'utf8');
  const sdk=process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || properties.match(/^sdk.dir=(.+)$/m)?.[1].trim().replace(/\\([\\: ])/g,'$1');
  if (!sdk) throw Error('Android SDK not found');
  const tools=readdirSync(join(sdk,'build-tools')).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true})).map(item=>join(sdk,'build-tools',item)).find(item=>existsSync(join(item,'aapt.exe')) && existsSync(join(item,'lib/apksigner.jar')));
  if (!tools) throw Error('aapt/apksigner not installed in Android SDK build-tools');
  const config=execFileSync('cmd.exe',['/d','/s','/c','flutter config --list'],{cwd:app,encoding:'utf8'});
  const jdk=config.match(/^\s*jdk-dir:\s*(.+)$/m)?.[1].trim();
  const java=jdk && jdk !== '(Not set)' ? join(jdk,'bin/java.exe') : 'java';
  const badging=execFileSync(join(tools,'aapt.exe'),['dump','badging',apk],{encoding:'utf8'});
  const signing=execFileSync(java,['-jar',join(tools,'lib/apksigner.jar'),'verify','--verbose','--print-certs',apk],{encoding:'utf8'});
  const clients=JSON.parse(readFileSync(join(app,'android/app/google-services.json'),'utf8')).client.flatMap(item=>item.oauth_client || []);
  const certificate=checkAndroidIdentity(badging,signing,version,build,clients);
  console.log(`Verified Android release ${version}+${build}; signing SHA-256 ${certificate.sha256}`);
  return certificate;
}
