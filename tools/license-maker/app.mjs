import { createApp, ref, shallowRef } from 'vue';
import { render } from 'virtual:license-view';
import { generateTestIssuerPem, issueLicense, MAX_FILE_BYTES, readApplication, readIssuerPem } from './license-crypto.mjs';

const featureOptions = [
  ['ai_voice', 'AI 语音机器人'], ['auto_outbound', '自动外呼']
];
const limitOptions = [
  ['ai_concurrent_calls', 'AI 通话并发'], ['ai_robots', '启用的 AI 流程机器人'],
  ['seats', '启用的坐席'], ['extensions', '已创建的分机']
];

function defaultExpiry() {
  const end = new Date();
  end.setDate(end.getDate() + 30);
  return new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function download(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

createApp({
  render,
  setup() {
    const request = shallowRef(null);
    const requestName = ref('');
    const issuer = shallowRef(null);
    const issuerName = ref('');
    const error = ref('');
    const notice = ref('');
    const busy = ref(false);
    const permanent = ref(false);
    const expires = ref(defaultExpiry());
    const features = ref({});
    const limits = ref({});
    const publicInput = ref(null);
    const ready = typeof globalThis.crypto?.subtle?.sign === 'function' && typeof globalThis.crypto?.randomUUID === 'function';

    async function perform(action) {
      if (busy.value) return;
      busy.value = true;
      error.value = '';
      notice.value = '';
      try {
        await action();
      } catch (cause) {
        error.value = cause?.name === 'NotSupportedError'
          ? '当前浏览器不支持 Ed25519，请用较新版本的 Edge 或 Chrome。'
          : cause?.name === 'DataError' ? '密钥格式无效，请检查所选文件。' : (cause?.message || '操作失败。');
      } finally {
        busy.value = false;
      }
    }

    function selected(event) {
      const input = event.target;
      const file = input.files?.[0];
      input.value = '';
      return file;
    }

    async function fileText(file, maxSize) {
      if (!file.size || file.size > maxSize) throw new Error(`文件必须为 1 至 ${maxSize} 字节。`);
      return file.text();
    }

    function loadRequest(event) {
      const file = selected(event);
      if (!file) return;
      return perform(async () => {
        request.value = null;
        requestName.value = '';
        request.value = await readApplication(await fileText(file, MAX_FILE_BYTES));
        requestName.value = file.name;
      });
    }

    function loadIssuer(event) {
      const file = selected(event);
      if (!file) return;
      return perform(async () => {
        clearIssuer();
        issuer.value = await readIssuerPem(await fileText(file, 4096));
        issuerName.value = file.name;
      });
    }

    function clearIssuer() {
      issuer.value = null;
      issuerName.value = '';
    }

    function generateTestKey() {
      return perform(async () => {
        if (issuer.value) throw new Error('请先移除当前签发密钥。');
        const pem = await generateTestIssuerPem();
        issuer.value = await readIssuerPem(pem);
        issuerName.value = '本次生成的测试签发密钥';
        download(`callnexus-test-issuer-${crypto.randomUUID().slice(0, 8)}.pem`, pem, 'application/x-pem-file');
        notice.value = '测试私钥已发起下载。请保存在受限位置；以后用同一把测试私钥续期。';
      });
    }

    async function copyPublic() {
      if (!issuer.value) return;
      try {
        await navigator.clipboard.writeText(issuer.value.publicKey);
        notice.value = '发行方公钥已复制。';
      } catch {
        publicInput.value?.focus();
        publicInput.value?.select();
        notice.value = '已选中公钥，请按 Ctrl+C 复制。';
      }
    }

    function trial() {
      permanent.value = false;
      expires.value = defaultExpiry();
      features.value = { ai_voice: 'on', auto_outbound: 'on' };
      limits.value = { ai_concurrent_calls: '2', ai_robots: '2', seats: '2', extensions: '3' };
    }

    function signRequest() {
      return perform(async () => {
        if (!request.value || !issuer.value) throw new Error('请先读取申请和签发密钥。');
        const featureEntries = Object.entries(features.value).filter(([, value]) => value).map(([key, value]) => [key, value === 'on']);
        const limitEntries = Object.entries(limits.value).filter(([, value]) => String(value).trim() !== '').map(([key, value]) => {
          if (!/^(?:-1|\d+)$/.test(String(value))) throw new Error('额度必须是非负整数或 -1（不限）。');
          return [key, Number(value)];
        });
        const { licenseId, text } = await issueLicense(request.value, issuer.value.privateKey, {
          expiresAt: permanent.value ? null : new Date(expires.value),
          features: Object.fromEntries(featureEntries), limits: Object.fromEntries(limitEntries)
        });
        download(`callnexus-${licenseId}.lic`, text, 'application/json');
        notice.value = '授权文件已发起下载。请在 CallNexus → 系统管理 → 授权管理中导入。';
      });
    }

    return { ready, request, requestName, issuer, issuerName, error, notice, busy, permanent, expires, features, limits, publicInput,
      featureOptions, limitOptions, loadRequest, loadIssuer, clearIssuer, generateTestKey, copyPublic, trial, signRequest };
  }
}).mount('#app');
