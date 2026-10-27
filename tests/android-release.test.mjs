import test from 'node:test';
import assert from 'node:assert/strict';
import {checkAndroidIdentity} from '../scripts/verify-android.mjs';
const sha1='a'.repeat(40),sha256='b'.repeat(64);
const badging="package: name='com.whitewarelab.homelyhamster' versionCode='12' versionName='1.0.10' platformBuildVersionName='16'";
const signing=`Verified using v2 scheme (APK Signature Scheme v2): true\nSigner #1 certificate DN: CN=Homely Hamster\nSigner #1 certificate SHA-1 digest: ${sha1}\nSigner #1 certificate SHA-256 digest: ${sha256}\n`;
const clients=[{client_type:1,android_info:{package_name:'com.whitewarelab.homelyhamster',certificate_hash:sha1}}];
test('accepts a signed release only when package, embedded version and Google OAuth certificate agree',()=>{
  assert.deepEqual(checkAndroidIdentity(badging,signing,'1.0.10',12,clients),{sha1,sha256});
  assert.throws(()=>checkAndroidIdentity(badging,signing,'1.0.10',13,clients));
  assert.throws(()=>checkAndroidIdentity(badging,signing,'1.0.10',12,[]));
  assert.throws(()=>checkAndroidIdentity(badging,signing.replace(': true',': false'),'1.0.10',12,clients));
});
test('rejects renamed debug APKs and unexpected application IDs',()=>{
  assert.throws(()=>checkAndroidIdentity(badging+'\napplication-debuggable',signing,'1.0.10',12,clients));
  assert.throws(()=>checkAndroidIdentity(badging,signing.replace('CN=Homely Hamster','CN=Android Debug'),'1.0.10',12,clients));
  assert.throws(()=>checkAndroidIdentity(badging.replace('homelyhamster','other'),signing,'1.0.10',12,clients));
});
