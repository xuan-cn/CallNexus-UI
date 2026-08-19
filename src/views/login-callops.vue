<template>
  <div class="login-page">
    <div class="scene" aria-hidden="true">
      <span class="vignette"></span>
      <span class="glow g-left"></span>
      <span class="glow g-right"></span>
      <span class="aurora a1"></span>
      <span class="aurora a2"></span>
      <span class="aurora a3"></span>
      <span class="rays"></span>
      <span class="stars"></span>
      <span class="floor"></span>
      <span class="spark sp1"></span>
      <span class="spark sp2"></span>
      <span class="spark sp3"></span>
      <span class="spark sp4"></span>
      <span class="spark sp5"></span>
      <span class="spark sp6"></span>
      <span v-for="n in 12" :key="`fly-${n}`" class="firefly" :class="`f${n}`"></span>
    </div>

    <header class="topbar">
      <div class="brand-mark">
        <span class="logo">
          <span class="material-symbols-outlined">headset_mic</span>
        </span>
        <div>
          <strong>CallNexus</strong>
          <em class="live"><i></i>{{ proxy.$t('login.onlineStatus') }}</em>
        </div>
      </div>
      <div class="lang">
        <lang-select />
      </div>
    </header>

    <main class="stage">
      <section class="intro">
        <h1>
          <span v-for="(ch, i) in titleChars" :key="i" :style="{ '--i': i }">{{ ch }}</span>
        </h1>
        <p class="tagline">
          <span :style="{ '--i': 0 }">{{ proxy.$t('login.heroPart1') }}</span>
          <em>·</em>
          <span :style="{ '--i': 1 }">{{ proxy.$t('login.heroPart2') }}</span>
          <em>·</em>
          <span :style="{ '--i': 2 }">{{ proxy.$t('login.heroPart3') }}</span>
        </p>
        <div class="chips">
          <span :style="{ '--i': 0 }">{{ proxy.$t('login.chip1') }}</span>
          <span :style="{ '--i': 1 }">{{ proxy.$t('login.chip2') }}</span>
          <span :style="{ '--i': 2 }">{{ proxy.$t('login.chip3') }}</span>
        </div>
        <ul>
          <li v-for="(item, index) in featureItems" :key="item.text" :style="{ '--i': index }">
            <span class="no">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="material-symbols-outlined fi">{{ item.icon }}</span>
            {{ item.text }}
          </li>
        </ul>
      </section>

      <section class="auth-pane">
        <div class="auth-card">
        <div class="auth-head">
          <h2>{{ proxy.$t('login.welcome') }}</h2>
          <p class="desc">{{ proxy.$t('login.formHint') }}</p>
        </div>

        <el-form ref="loginRef" :model="loginForm" :rules="loginRules" class="login-form">
          <el-form-item v-if="tenantEnabled" prop="tenantId">
            <div class="field">
              <span class="material-symbols-outlined ico">apartment</span>
              <el-select
                v-model="loginForm.tenantId"
                filterable
                size="large"
                style="width: 100%"
                :placeholder="proxy.$t('login.selectPlaceholder')"
                popper-class="login-select-dropdown"
              >
                <el-option v-for="item in tenantList" :key="item.tenantId" :label="item.companyName" :value="item.tenantId" />
              </el-select>
            </div>
          </el-form-item>

          <el-form-item prop="username">
            <div class="field">
              <span class="material-symbols-outlined ico">person</span>
              <el-input
                v-model="loginForm.username"
                type="text"
                size="large"
                auto-complete="off"
                :placeholder="proxy.$t('login.account')"
              />
            </div>
          </el-form-item>

          <el-form-item prop="password">
            <div class="field">
              <span class="material-symbols-outlined ico">lock</span>
              <el-input
                v-model="loginForm.password"
                type="password"
                size="large"
                show-password
                auto-complete="off"
                :placeholder="proxy.$t('login.password')"
                @keyup.enter="handleLogin"
              />
            </div>
          </el-form-item>

          <el-form-item v-if="captchaEnabled" prop="code">
            <div class="captcha">
              <div class="field">
                <span class="material-symbols-outlined ico">verified_user</span>
                <el-input
                  v-model="loginForm.code"
                  size="large"
                  auto-complete="off"
                  :placeholder="proxy.$t('login.code')"
                  @keyup.enter="handleLogin"
                />
              </div>
              <button class="captcha-box" type="button" :title="proxy.$t('login.refreshCode')" @click="getCode">
                <img :src="codeUrl" class="captcha-img" alt="captcha" />
                <span class="material-symbols-outlined refresh">refresh</span>
              </button>
            </div>
          </el-form-item>

          <el-checkbox v-model="loginForm.rememberMe" class="remember">{{ proxy.$t('login.rememberAccount') }}</el-checkbox>

          <el-button :loading="loading" class="submit" @click.prevent="handleLogin">
            {{ loading ? proxy.$t('login.logging') : proxy.$t('login.login') }}
          </el-button>
        </el-form>
        </div>
      </section>
    </main>

    <footer class="foot">
      <div class="wave">
        <span v-for="n in 12" :key="n" :style="{ animationDelay: `${n * 0.08}s` }"></span>
      </div>
      <small>© {{ currentYear }} CallNexus</small>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { getCodeImg, getTenantList } from '@/api/login';
import { useUserStore } from '@/store/modules/user';
import { LoginData, TenantVO } from '@/api/types';
import { to } from 'await-to-js';
import { useI18n } from 'vue-i18n';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const userStore = useUserStore();
const router = useRouter();
const { t } = useI18n();
const titleChars = computed(() => Array.from(t('login.heroTitle')));
const featureItems = computed(() => [
  { icon: 'phone_in_talk', text: t('login.dispatchFeature1') },
  { icon: 'cell_tower', text: t('login.dispatchFeature2') },
  { icon: 'e911_emergency', text: t('login.dispatchFeature3') }
]);

const loginForm = ref<LoginData>({
  tenantId: '',
  username: '',
  password: '',
  rememberMe: false,
  code: '',
  uuid: ''
} as LoginData);

const loginRules: ElFormRules = {
  tenantId: [{ required: true, trigger: 'blur', message: t('login.rule.tenantId.required') }],
  username: [{ required: true, trigger: 'blur', message: t('login.rule.username.required') }],
  password: [{ required: true, trigger: 'blur', message: t('login.rule.password.required') }],
  code: [{ required: true, trigger: 'change', message: t('login.rule.code.required') }]
};

const codeUrl = ref('');
const loading = ref(false);
const captchaEnabled = ref(true);
const tenantEnabled = ref(true);
const redirect = ref('/');
const loginRef = ref<ElFormInstance>();
const tenantList = ref<TenantVO[]>([]);
const currentYear = new Date().getFullYear();

watch(
  () => router.currentRoute.value,
  (newRoute: any) => {
    redirect.value = newRoute.query && newRoute.query.redirect && decodeURIComponent(newRoute.query.redirect);
  },
  { immediate: true }
);

const handleLogin = () => {
  loginRef.value?.validate(async (valid: boolean, fields: any) => {
    if (valid) {
      loading.value = true;
      if (loginForm.value.rememberMe) {
        localStorage.setItem('tenantId', String(loginForm.value.tenantId));
        localStorage.setItem('username', String(loginForm.value.username));
        localStorage.setItem('password', String(loginForm.value.password));
        localStorage.setItem('rememberMe', String(loginForm.value.rememberMe));
      } else {
        localStorage.removeItem('tenantId');
        localStorage.removeItem('username');
        localStorage.removeItem('password');
        localStorage.removeItem('rememberMe');
      }
      const [err] = await to(userStore.login(loginForm.value));
      if (!err) {
        await router.push(redirect.value || '/');
        loading.value = false;
      } else {
        loading.value = false;
        if (captchaEnabled.value) await getCode();
      }
    } else {
      console.log('error submit!', fields);
    }
  });
};

const getCode = async () => {
  const res = await getCodeImg();
  const { data } = res;
  captchaEnabled.value = data.captchaEnabled === undefined ? true : data.captchaEnabled;
  if (captchaEnabled.value) {
    loginForm.value.code = '';
    codeUrl.value = 'data:image/gif;base64,' + data.img;
    loginForm.value.uuid = data.uuid;
  }
};

const getLoginData = () => {
  const tenantId = localStorage.getItem('tenantId');
  const username = localStorage.getItem('username');
  const password = localStorage.getItem('password');
  const rememberMe = localStorage.getItem('rememberMe');
  loginForm.value = {
    tenantId: tenantId === null ? String(loginForm.value.tenantId) : tenantId,
    username: username === null ? String(loginForm.value.username) : username,
    password: password === null ? String(loginForm.value.password) : String(password),
    rememberMe: rememberMe === null ? false : Boolean(rememberMe)
  } as LoginData;
};

const initTenantList = async () => {
  const { data } = await getTenantList(false);
  tenantEnabled.value = data.tenantEnabled === undefined ? true : data.tenantEnabled;
  if (tenantEnabled.value) {
    tenantList.value = data.voList;
    if (tenantList.value != null && tenantList.value.length !== 0) {
      loginForm.value.tenantId = tenantList.value[0].tenantId;
    }
  }
};

onMounted(() => {
  document.documentElement.classList.add('login-lock');
  getCode();
  initTenantList();
  getLoginData();
});

onUnmounted(() => {
  document.documentElement.classList.remove('login-lock');
});
</script>

<style lang="scss" scoped>
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap');

$bg: #12203c;
$panel: #1a2d52;
$line: #3d547a;
$text: #f3f6fb;
$muted: #9aacc6;
$blue: #3b82f6;

@keyframes pulse-dot {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
  }
}
@keyframes ray-shift {
  0%,
  100% {
    opacity: 0.45;
    transform: translateX(0);
  }
  50% {
    opacity: 0.8;
    transform: translateX(18px);
  }
}
@keyframes seq-glow {
  0%,
  10%,
  100% {
    color: inherit;
    text-shadow: none;
  }
  5% {
    color: #fff;
    text-shadow:
      0 0 10px #67e8f9,
      0 0 22px rgba(34, 211, 238, 0.8);
  }
}
@keyframes seq-chip {
  0%,
  12%,
  100% {
    color: #c9d7ff;
    border-color: rgba(147, 176, 255, 0.3);
    box-shadow: none;
    background: rgba(255, 255, 255, 0.06);
  }
  6% {
    color: #fff;
    border-color: rgba(34, 211, 238, 0.85);
    background: rgba(34, 211, 238, 0.14);
    box-shadow: 0 0 16px rgba(34, 211, 238, 0.32);
  }
}
@keyframes seq-row {
  0%,
  12%,
  100% {
    border-color: rgba(255, 255, 255, 0.07);
    background: rgba(255, 255, 255, 0.06);
    box-shadow: none;
  }
  6% {
    border-color: rgba(34, 211, 238, 0.6);
    background: rgba(34, 211, 238, 0.12);
    box-shadow: 0 0 18px rgba(34, 211, 238, 0.22);
  }
}
@keyframes firefly-blink {
  0%,
  100% {
    opacity: 0.12;
    transform: scale(0.7);
  }
  45%,
  55% {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes firefly-drift {
  0%,
  100% {
    translate: 0 0;
  }
  25% {
    translate: 36px -52px;
  }
  50% {
    translate: -28px -110px;
  }
  75% {
    translate: 48px -36px;
  }
}
@keyframes twinkle {
  0%,
  100% {
    opacity: 0.25;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.15);
  }
}
@keyframes beam-sweep {
  0% {
    transform: translateY(-120%);
    opacity: 0;
  }
  12% {
    opacity: 0.35;
  }
  100% {
    transform: translateY(220%);
    opacity: 0;
  }
}
@keyframes wave {
  0%,
  100% {
    transform: scaleY(0.35);
  }
  50% {
    transform: scaleY(1);
  }
}
@keyframes card-breathe {
  0%,
  100% {
    box-shadow:
      0 0 16px rgba(34, 211, 238, 0.08),
      0 18px 40px rgba(4, 10, 24, 0.32);
    border-color: rgba(56, 189, 248, 0.22);
  }
  50% {
    box-shadow:
      0 0 22px rgba(34, 211, 238, 0.14),
      0 18px 40px rgba(4, 10, 24, 0.32);
    border-color: rgba(56, 189, 248, 0.34);
  }
}
@keyframes shine {
  0%,
  55% {
    transform: translateX(-130%);
  }
  75%,
  100% {
    transform: translateX(130%);
  }
}
@keyframes aurora-pulse {
  0%,
  100% {
    opacity: 0.7;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.08);
  }
}

.login-page {
  position: fixed;
  inset: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  color: $text;
  background:
    radial-gradient(ellipse 80% 60% at 18% 28%, rgba(56, 189, 248, 0.16), transparent 55%),
    radial-gradient(ellipse 70% 50% at 86% 18%, rgba(34, 211, 238, 0.1), transparent 50%),
    linear-gradient(165deg, #152a4c 0%, #0e1a30 48%, #0a1424 100%);
  --el-fill-color-blank: #15274a;
  --el-bg-color: transparent;
  --el-text-color-primary: #f3f6fb;
  --el-text-color-regular: #c5d0e6;
  --el-border-color: #3d547a;
  --el-border-color-hover: #60a5fa;
  --el-color-primary: #3b82f6;
  --el-input-bg-color: #15274a;
  --el-input-text-color: #f3f6fb;
  --el-input-border-color: #3d547a;
  --el-input-hover-border-color: #60a5fa;
  --el-input-focus-border-color: #3b82f6;
}

.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
  font-weight: normal;
  font-style: normal;
  font-size: 20px;
  line-height: 1;
  display: inline-block;
  -webkit-font-smoothing: antialiased;
}

.scene {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 42%, rgba(6, 12, 24, 0.55) 100%);
}

.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
}
.g-left {
  width: 420px;
  height: 420px;
  left: -120px;
  top: 18%;
  background: rgba(37, 99, 235, 0.22);
}
.g-right {
  width: 360px;
  height: 360px;
  right: -80px;
  top: 8%;
  background: rgba(34, 211, 238, 0.14);
}

.rays {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(118deg, transparent 38%, rgba(125, 211, 252, 0.07) 40.5%, transparent 43%),
    linear-gradient(132deg, transparent 52%, rgba(34, 211, 238, 0.05) 54%, transparent 57%);
  animation: ray-shift 14s ease-in-out infinite;
}

.stars {
  position: absolute;
  width: 2px;
  height: 2px;
  left: 0;
  top: 0;
  border-radius: 50%;
  background: #e0f2fe;
  box-shadow:
    80px 70px 0 0 rgba(224, 242, 254, 0.7),
    160px 140px 0 1px rgba(125, 211, 252, 0.55),
    280px 60px 0 0 rgba(224, 242, 254, 0.45),
    420px 110px 0 0 rgba(103, 232, 249, 0.5),
    540px 40px 0 1px rgba(224, 242, 254, 0.4),
    680px 160px 0 0 rgba(125, 211, 252, 0.5),
    820px 90px 0 0 rgba(224, 242, 254, 0.35),
    940px 200px 0 1px rgba(110, 231, 183, 0.45),
    1100px 70px 0 0 rgba(224, 242, 254, 0.4),
    200px 260px 0 0 rgba(125, 211, 252, 0.35),
    760px 280px 0 0 rgba(224, 242, 254, 0.3),
    980px 320px 0 0 rgba(103, 232, 249, 0.4),
    120px 480px 0 0 rgba(224, 242, 254, 0.28),
    880px 520px 0 1px rgba(125, 211, 252, 0.32);
  animation: twinkle 5s ease-in-out infinite;
}

.floor {
  position: absolute;
  left: -15%;
  right: -15%;
  bottom: -18%;
  height: 48%;
  background-image:
    linear-gradient(rgba(56, 189, 248, 0.16) 1px, transparent 1px),
    linear-gradient(90deg, rgba(56, 189, 248, 0.12) 1px, transparent 1px);
  background-size: 56px 56px;
  transform: perspective(500px) rotateX(64deg);
  transform-origin: center bottom;
  mask-image: linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent 78%);
  -webkit-mask-image: linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent 78%);
}

.spark {
  position: absolute;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #e0f2fe;
  box-shadow: 0 0 8px #67e8f9;
  animation: twinkle 3.2s ease-in-out infinite;
}
.sp1 {
  left: 18%;
  top: 22%;
}
.sp2 {
  left: 72%;
  top: 18%;
  animation-delay: 0.6s;
}
.sp3 {
  left: 86%;
  top: 58%;
  animation-delay: 1.1s;
  background: #6ee7b7;
  box-shadow: 0 0 8px #34d399;
}
.sp4 {
  left: 8%;
  top: 68%;
  animation-delay: 1.8s;
}
.sp5 {
  left: 48%;
  top: 12%;
  animation-delay: 0.3s;
}
.sp6 {
  left: 62%;
  top: 78%;
  animation-delay: 2.2s;
}

.firefly {
  position: absolute;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #fef08a;
  box-shadow:
    0 0 6px #facc15,
    0 0 14px rgba(190, 242, 100, 0.85),
    0 0 24px rgba(253, 224, 71, 0.35);
  animation:
    firefly-blink 2.8s ease-in-out infinite,
    firefly-drift 11s ease-in-out infinite;
}
.f1 {
  left: 12%;
  top: 62%;
}
.f2 {
  left: 28%;
  top: 74%;
  animation-delay: 0.8s, 1.2s;
  animation-duration: 3.2s, 13s;
}
.f3 {
  left: 46%;
  top: 58%;
  animation-delay: 1.6s, 0.4s;
  width: 4px;
  height: 4px;
}
.f4 {
  left: 63%;
  top: 70%;
  animation-delay: 2.2s, 2s;
  animation-duration: 2.4s, 15s;
}
.f5 {
  left: 78%;
  top: 42%;
  animation-delay: 0.4s, 3s;
}
.f6 {
  left: 8%;
  top: 38%;
  animation-delay: 2.8s, 1.6s;
  width: 6px;
  height: 6px;
}
.f7 {
  left: 88%;
  top: 76%;
  animation-delay: 1.1s, 2.4s;
  background: #d9f99d;
  box-shadow:
    0 0 6px #a3e635,
    0 0 14px rgba(163, 230, 53, 0.7);
}
.f8 {
  left: 34%;
  top: 28%;
  animation-delay: 3.2s, 0.8s;
  width: 4px;
  height: 4px;
}
.f9 {
  left: 54%;
  top: 82%;
  animation-delay: 0.2s, 4s;
}
.f10 {
  left: 72%;
  top: 22%;
  animation-delay: 1.8s, 1s;
  animation-duration: 3.6s, 12s;
}
.f11 {
  left: 18%;
  top: 48%;
  animation-delay: 2.4s, 2.8s;
  background: #bbf7d0;
  box-shadow:
    0 0 6px #86efac,
    0 0 14px rgba(74, 222, 128, 0.65);
}
.f12 {
  left: 92%;
  top: 54%;
  animation-delay: 3.6s, 0.6s;
  width: 4px;
  height: 4px;
}

.aurora {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
}
.a1 {
  width: 320px;
  height: 320px;
  left: -80px;
  bottom: 10%;
  background: rgba(59, 130, 246, 0.22);
  animation: aurora-pulse 8s ease-in-out infinite;
}
.a2 {
  width: 240px;
  height: 240px;
  right: 12%;
  top: -60px;
  background: rgba(56, 189, 248, 0.12);
  animation: aurora-pulse 10s ease-in-out 1.4s infinite;
}
.a3 {
  width: 200px;
  height: 200px;
  right: 30%;
  bottom: -40px;
  background: rgba(45, 212, 191, 0.08);
  animation: aurora-pulse 12s ease-in-out 2s infinite;
}

.topbar {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 40px 0;
}

.brand-mark {
  display: flex;
  align-items: center;
  gap: 12px;
  strong {
    display: block;
    font-size: 20px;
    line-height: 1.1;
  }
}

.logo {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(180deg, #fff, #e8eeff);
  color: #1e3a8a;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18), 0 0 16px rgba(125, 211, 252, 0.35);
  .material-symbols-outlined {
    font-size: 22px;
    font-variation-settings: 'FILL' 1;
  }
}

.live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 11px;
  font-style: normal;
  color: #86efac;
  i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #22c55e;
    animation: pulse-dot 1.6s ease-out infinite;
  }
}

.lang {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid $line;
  background: rgba(255, 255, 255, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  :deep(.lang-select--style) {
    line-height: 1;
    color: $text;
    cursor: pointer;
  }
  :deep(.svg-icon) {
    color: $text;
    fill: currentColor;
  }
}

.stage {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 72px;
  align-items: center;
  width: min(1080px, calc(100% - 80px));
  margin: 0 auto;
}

.intro h1 {
  margin: 0 0 12px;
  font-size: clamp(32px, 3.6vw, 44px);
  line-height: 1.2;
  cursor: default;
  span {
    display: inline-block;
    animation: seq-glow 5.6s ease-in-out infinite;
    animation-delay: calc(var(--i) * 0.12s);
  }
  &:hover span {
    animation: none;
    text-shadow:
      0 0 12px rgba(125, 211, 252, 0.9),
      0 0 32px rgba(34, 211, 238, 0.55);
  }
}
.tagline {
  margin: 0 0 20px;
  color: $muted;
  letter-spacing: 0.1em;
  font-size: 14px;
  cursor: default;
  span {
    display: inline-block;
    animation: seq-glow 5.6s ease-in-out infinite;
    animation-delay: calc(1.1s + var(--i) * 0.22s);
  }
  em {
    margin: 0 8px;
    font-style: normal;
    opacity: 0.55;
  }
  &:hover span {
    animation: none;
    color: #e0f2fe;
    text-shadow: 0 0 12px rgba(56, 189, 248, 0.55);
  }
}
.chips {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  span {
    padding: 6px 11px;
    border: 1px solid rgba(147, 176, 255, 0.3);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    font-size: 12px;
    color: #c9d7ff;
    cursor: default;
    animation: seq-chip 5.6s ease-in-out infinite;
    animation-delay: calc(1.85s + var(--i) * 0.24s);
    transition: transform 0.25s ease;
    &:hover {
      animation: none;
      color: #fff;
      border-color: rgba(34, 211, 238, 0.75);
      background: rgba(34, 211, 238, 0.12);
      box-shadow: 0 0 14px rgba(34, 211, 238, 0.28);
      transform: translateY(-1px);
    }
  }
}
.intro ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 420px;
}
.intro li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.07);
  font-size: 14px;
  color: rgba(255, 255, 255, 0.92);
  cursor: default;
  animation: seq-row 5.6s ease-in-out infinite;
  animation-delay: calc(2.65s + var(--i) * 0.28s);
  transition: transform 0.25s ease;
}
.intro li:hover {
  animation: none;
  border-color: rgba(34, 211, 238, 0.55);
  background: rgba(34, 211, 238, 0.1);
  box-shadow: 0 0 18px rgba(34, 211, 238, 0.18);
  transform: translateX(6px);
  .no,
  .fi {
    color: #67e8f9;
    text-shadow: 0 0 10px rgba(34, 211, 238, 0.7);
  }
}
.no {
  width: 28px;
  color: #93b0ff;
  font-size: 12px;
  font-weight: 700;
}
.fi {
  font-size: 18px;
  color: #bfd0ff;
}

.auth-pane {
  position: relative;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  box-shadow: none;
  color: $text;
}
.auth-card {
  position: relative;
  padding: 36px 32px 28px;
  border-radius: 16px;
  background: rgba(10, 24, 46, 0.32) !important;
  border: 1px solid rgba(56, 189, 248, 0.26);
  animation: card-breathe 4.8s ease-in-out infinite;
}
.auth-head {
  margin-bottom: 22px;
}
.auth-pane h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 8px;
  font-size: 26px;
  font-weight: 700;
  color: $text;
}
.auth-pane h2::before {
  content: '';
  width: 4px;
  height: 22px;
  border-radius: 4px;
  background: #22d3ee;
  box-shadow: 0 0 10px rgba(34, 211, 238, 0.8);
}
.desc {
  margin: 0 0 0 14px;
  color: $muted;
  font-size: 13px;
}

.login-form,
.login-form :deep(.el-form-item),
.login-form :deep(.el-form-item__content),
.login-form :deep(.el-input),
.login-form :deep(.el-select) {
  width: 100%;
  background: transparent;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 12px;
}
.login-form :deep(.el-form-item__content) {
  display: flex;
  width: 100%;
  line-height: normal;
}
.login-form :deep(.el-form-item__error) {
  color: #f0a0a0;
  padding-top: 2px;
}

.field {
  position: relative;
  width: 100%;
  flex: 1;
  min-width: 0;
}
.ico {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  color: #7dd3fc;
  font-size: 18px;
  pointer-events: none;
}

.field:focus-within .ico {
  color: #22d3ee;
}

.login-form :deep(.el-select),
.login-form :deep(.el-select__wrapper) {
  width: 100% !important;
}

.login-form :deep(.el-input__wrapper),
.login-form :deep(.el-select__wrapper) {
  width: 100%;
  height: 46px !important;
  min-height: 46px !important;
  padding: 0 12px 0 42px;
  display: flex;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.06) !important;
  box-shadow: 0 0 0 1px rgba(148, 187, 230, 0.28) inset !important;
  border-radius: 12px;
  transition: box-shadow 0.25s ease, background-color 0.25s ease;
}
.login-form :deep(.el-input__wrapper:hover),
.login-form :deep(.el-select__wrapper:hover) {
  background-color: rgba(255, 255, 255, 0.08) !important;
  box-shadow: 0 0 0 1px rgba(125, 211, 252, 0.42) inset !important;
}
.login-form :deep(.el-input__wrapper.is-focus),
.login-form :deep(.el-select__wrapper.is-focused),
.login-form :deep(.el-select__wrapper.is-focus) {
  background-color: rgba(255, 255, 255, 0.08) !important;
  box-shadow:
    0 0 0 1px rgba(56, 189, 248, 0.55) inset,
    0 0 12px rgba(34, 211, 238, 0.16) !important;
}

.login-form :deep(.el-input__inner),
.login-form :deep(.el-select__selected-item),
.login-form :deep(.el-select__placeholder) {
  height: 46px;
  line-height: 46px;
  color: $text !important;
  font-size: 14px;
}
.login-form :deep(.el-input__inner::placeholder),
.login-form :deep(.el-select__placeholder) {
  color: #7d8eab !important;
}
.login-form :deep(.el-input__suffix),
.login-form :deep(.el-select__suffix) {
  color: #8aa0c2;
}
.login-form :deep(input:-webkit-autofill) {
  -webkit-text-fill-color: $text;
  box-shadow: 0 0 0 1000px #163056 inset;
  transition: background-color 99999s ease-out;
}

.captcha {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 148px;
  gap: 10px;
  width: 100%;
  align-items: center;
}
.captcha-box {
  position: relative;
  height: 46px;
  padding: 0;
  border: 1px solid rgba(148, 187, 230, 0.32);
  border-radius: 12px;
  overflow: hidden;
  background: #0b1a30;
  cursor: pointer;
}
.captcha-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  display: block;
}
.refresh {
  position: absolute;
  right: 4px;
  top: 4px;
  font-size: 12px;
  color: #7dd3fc;
  background: rgba(11, 26, 48, 0.7);
  border-radius: 50%;
}

.remember {
  margin: 2px 0 16px;
  :deep(.el-checkbox__label) {
    color: $muted;
    font-size: 13px;
  }
  :deep(.el-checkbox__inner) {
    background: transparent;
    border-color: $line;
    border-radius: 4px;
  }
  :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
    background: #22d3ee;
    border-color: #22d3ee;
  }
}

.submit {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 46px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.28em;
  color: #fff !important;
  background: linear-gradient(90deg, #22d3ee 0%, #3b82f6 100%) !important;
  box-shadow: 0 8px 20px rgba(34, 211, 238, 0.22);
}
.submit::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 36%, rgba(255, 255, 255, 0.32) 50%, transparent 64%);
  animation: shine 3.8s ease-in-out infinite;
  pointer-events: none;
}
.submit:hover {
  filter: brightness(1.08);
  background: linear-gradient(90deg, #22d3ee 0%, #3b82f6 100%) !important;
}

.foot {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px 18px;
  small {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.38);
  }
}
.wave {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 18px;
  span {
    width: 3px;
    height: 100%;
    border-radius: 3px;
    background: linear-gradient(180deg, #93b0ff, #60a5fa);
    transform-origin: bottom;
    animation: wave 1.2s ease-in-out infinite;
  }
}

@media (max-width: 900px) {
  .intro,
  .floor {
    display: none;
  }
  .stage {
    grid-template-columns: 1fr;
    width: min(400px, calc(100% - 32px));
  }
}

:global(html.login-lock),
:global(html.login-lock body),
:global(html.login-lock #app) {
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: $bg;
}
</style>

<style lang="scss">
.login-select-dropdown {
  background: #1a2d52 !important;
  border: 1px solid #3d547a !important;
  .el-select-dropdown__item {
    color: #f3f6fb;
  }
  .el-select-dropdown__item.is-hovering,
  .el-select-dropdown__item.is-selected {
    background: #243a66;
    color: #fff;
  }
}
</style>
