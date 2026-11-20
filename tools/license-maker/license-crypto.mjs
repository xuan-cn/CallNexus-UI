const encoder = new TextEncoder();
const algorithm = 'Ed25519';
export const MAX_FILE_BYTES = 32 * 1024;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const code = /^[a-z][a-z0-9_]{0,63}$/;

function cryptoApi() {
  if (!globalThis.crypto?.subtle) throw new Error('当前浏览器无法使用本地密码接口，请用较新版本的 Edge 或 Chrome 打开。');
  return globalThis.crypto;
}

function toBase64(value) {
  return btoa(String.fromCharCode(...new Uint8Array(value)));
}

function fromBase64(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Error('Base64 编码无效。');
  const bytes = Uint8Array.from(atob(value), c => c.charCodeAt(0));
  if (toBase64(bytes) !== value) throw new Error('Base64 编码无效。');
  return bytes;
}

async function fingerprint(key) {
  const digest = await cryptoApi().subtle.digest('SHA-256', key);
  return Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
}

export async function readApplication(text) {
  if (!text || encoder.encode(text).byteLength > MAX_FILE_BYTES) throw new Error('申请文件必须为 1 至 32768 字节。');
  let envelope;
  let request;
  try {
    envelope = JSON.parse(text);
    if (typeof envelope?.payload !== 'string' || typeof envelope.signature !== 'string') throw new Error();
    request = JSON.parse(envelope.payload);
  } catch {
    throw new Error('请选择系统导出的授权申请 JSON，不是 .lic 或私钥文件。');
  }
  if (request?.version !== 1 || request.product !== 'CALLNEXUS' || request.algorithm !== algorithm
    || typeof request.deploymentId !== 'string' || !uuid.test(request.deploymentId)) {
    throw new Error('不是受支持的 CallNexus 部署申请。');
  }
  const publicBytes = fromBase64(request.publicKey);
  const signature = fromBase64(envelope.signature);
  const { subtle } = cryptoApi();
  if (signature.length !== 64 || await fingerprint(publicBytes) !== request.publicKeyFingerprint) {
    throw new Error('申请签名或公钥指纹无效。');
  }
  const key = await subtle.importKey('spki', publicBytes, algorithm, false, ['verify']);
  if (!await subtle.verify(algorithm, key, signature, encoder.encode(envelope.payload))) throw new Error('申请签名无效。');
  return Object.freeze({ deploymentId: request.deploymentId, publicKeyFingerprint: request.publicKeyFingerprint });
}

export async function readIssuerPem(pem) {
  const match = /^-----BEGIN PRIVATE KEY-----\s+([A-Za-z0-9+/=\s]+)-----END PRIVATE KEY-----\s*$/.exec(pem.trim());
  if (!match) throw new Error('请选择 Ed25519 PKCS#8 PEM 签发私钥，不是部署身份文件。');
  const { subtle } = cryptoApi();
  const bytes = fromBase64(match[1].replace(/\s/g, ''));
  const imported = await subtle.importKey('pkcs8', bytes, algorithm, true, ['sign']);
  const { x } = await subtle.exportKey('jwk', imported);
  const publicKey = await subtle.importKey('jwk', { kty: 'OKP', crv: algorithm, x }, algorithm, true, ['verify']);
  return {
    privateKey: await subtle.importKey('pkcs8', bytes, algorithm, false, ['sign']),
    publicKey: toBase64(await subtle.exportKey('spki', publicKey))
  };
}

export async function generateTestIssuerPem() {
  const { subtle } = cryptoApi();
  const { privateKey } = await subtle.generateKey(algorithm, true, ['sign', 'verify']);
  const base64 = toBase64(await subtle.exportKey('pkcs8', privateKey));
  return `-----BEGIN PRIVATE KEY-----\n${base64.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----\n`;
}

function validateEntries(entries, predicate) {
  const pairs = Object.entries(entries);
  if (pairs.length > 64 || pairs.some(([key, value]) => !code.test(key) || !predicate(value))) {
    throw new Error('功能或额度包含无效值。');
  }
}

export async function issueLicense(application, privateKey, { expiresAt, features, limits }) {
  const c = cryptoApi();
  const issuedAt = new Date();
  if (!application || !privateKey) throw new Error('请先读取申请文件和签发私钥。');
  if (expiresAt !== null && (!(expiresAt instanceof Date) || !(expiresAt > issuedAt))) throw new Error('有效期必须晚于当前时间。');
  validateEntries(features, value => typeof value === 'boolean');
  validateEntries(limits, value => Number.isInteger(value) && value >= -1 && value <= 2147483647);
  const licenseId = c.randomUUID();
  const payload = JSON.stringify({ version: 1, product: 'CALLNEXUS', ...application, licenseId, issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt?.toISOString() ?? null, features, limits });
  const signature = toBase64(await c.subtle.sign(algorithm, privateKey, encoder.encode(payload)));
  const text = `${JSON.stringify({ payload, signature }, null, 2)}\n`;
  if (encoder.encode(text).byteLength > MAX_FILE_BYTES) throw new Error('授权文件超过 32 KiB。');
  return { licenseId, text };
}
