import assert from 'node:assert/strict';
import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, randomUUID, sign, verify, webcrypto } from 'node:crypto';
import { test } from 'node:test';
import { generateTestIssuerPem, issueLicense, readApplication, readIssuerPem } from './license-crypto.mjs';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

function applicationEnvelope() {
  const keys = generateKeyPairSync('ed25519');
  const der = keys.publicKey.export({ type: 'spki', format: 'der' });
  const deploymentId = randomUUID();
  const publicKeyFingerprint = createHash('sha256').update(der).digest('hex');
  const payload = JSON.stringify({ version: 1, product: 'CALLNEXUS', algorithm: 'Ed25519', deploymentId,
    publicKey: der.toString('base64'), publicKeyFingerprint });
  return { payload, signature: sign(null, Buffer.from(payload), keys.privateKey).toString('base64') };
}

test('issues a backend-compatible license with an existing CLI issuer key', async () => {
  const pem = generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' });
  const issuer = await readIssuerPem(pem);
  const derived = createPublicKey(createPrivateKey(pem));
  assert.equal(issuer.publicKey, derived.export({ type: 'spki', format: 'der' }).toString('base64'));
  assert.equal(issuer.privateKey.extractable, false);
  const application = await readApplication(JSON.stringify(applicationEnvelope()));
  const terms = { expiresAt: new Date(Date.now() + 60000), features: { ai_voice: true }, limits: { seats: -1, ai_concurrent_calls: 20 } };
  const { text, licenseId } = await issueLicense(application, issuer.privateKey, terms);
  const { payload, signature } = JSON.parse(text);
  assert.ok(verify(null, Buffer.from(payload), derived, Buffer.from(signature, 'base64')));
  assert.deepEqual(JSON.parse(payload), { version: 1, product: 'CALLNEXUS', ...application, licenseId,
    issuedAt: JSON.parse(payload).issuedAt, expiresAt: terms.expiresAt.toISOString(), features: terms.features, limits: terms.limits });
  assert.ok(!text.includes('PRIVATE KEY'));
});

test('generates a reloadable test issuer and signs a permanent license', async () => {
  const pem = await generateTestIssuerPem();
  const first = await readIssuerPem(pem);
  const second = await readIssuerPem(pem);
  assert.equal(first.publicKey, second.publicKey);
  const application = await readApplication(JSON.stringify(applicationEnvelope()));
  const { text } = await issueLicense(application, second.privateKey, { expiresAt: null, features: {}, limits: {} });
  assert.equal(JSON.parse(JSON.parse(text).payload).expiresAt, null);
});

test('rejects altered applications, wrong files and invalid terms', async () => {
  const request = applicationEnvelope();
  const parsed = JSON.parse(request.payload);
  const altered = { ...request, payload: request.payload.replace(parsed.deploymentId, randomUUID()) };
  await assert.rejects(readApplication(JSON.stringify(altered)), /申请签名无效/);
  await assert.rejects(readApplication('{"privateKey":"not a request"}'), /系统导出的授权申请/);
  await assert.rejects(readIssuerPem(request.payload), /PKCS#8/);
  const application = await readApplication(JSON.stringify(request));
  const { privateKey } = await readIssuerPem(await generateTestIssuerPem());
  await assert.rejects(issueLicense(application, privateKey, { expiresAt: new Date(0), features: {}, limits: {} }), /有效期/);
  await assert.rejects(issueLicense(application, privateKey, { expiresAt: null, features: {}, limits: { seats: -2 } }), /额度/);
});
