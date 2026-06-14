<template>
  <div class="login-page">
    <!-- 顶部 AppBar -->
    <header class="top-bar">
      <div class="brand">
        <span class="material-symbols-outlined brand-icon">support_agent</span>
        <span class="brand-name">CallNexus</span>
      </div>
      <div class="top-actions">
        <lang-select class="lang-select" />
        <button class="icon-btn" type="button" title="帮助">
          <span class="material-symbols-outlined">help_outline</span>
        </button>
      </div>
    </header>

    <!-- 中间登录卡 -->
    <main class="main">
      <!-- 背景柔色斑 -->
      <div class="bg-decor">
        <span class="blob blob-l"></span>
        <span class="blob blob-r"></span>
      </div>

      <div class="login-card">
        <!-- 头部 -->
        <div class="card-header">
          <div class="header-icon">
            <span class="material-symbols-outlined">headset_mic</span>
          </div>
          <h1 class="card-title">{{ proxy.$t('login.welcome') }}</h1>
          <p class="card-desc">{{ title }}</p>
        </div>

        <!-- 表单 -->
        <el-form ref="loginRef" :model="loginForm" :rules="loginRules" class="login-form">
          <el-form-item v-if="tenantEnabled" prop="tenantId">
            <div class="field">
              <label class="field-label">租户</label>
              <el-select
                v-model="loginForm.tenantId"
                filterable
                size="large"
                :placeholder="proxy.$t('login.selectPlaceholder')"
                class="field-input"
              >
                <el-option v-for="item in tenantList" :key="item.tenantId" :label="item.companyName" :value="item.tenantId" />
              </el-select>
            </div>
          </el-form-item>

          <el-form-item prop="username">
            <div class="field">
              <label class="field-label">{{ proxy.$t('login.username') }}</label>
              <div class="input-wrap">
                <span class="material-symbols-outlined input-icon">person</span>
                <el-input
                  v-model="loginForm.username"
                  type="text"
                  size="large"
                  auto-complete="off"
                  :placeholder="proxy.$t('login.username')"
                  class="field-input has-prefix"
                />
              </div>
            </div>
          </el-form-item>

          <el-form-item prop="password">
            <div class="field">
              <div class="field-label-row">
                <label class="field-label">{{ proxy.$t('login.password') }}</label>
                <a class="field-link" href="javascript:void(0)">{{ proxy.$t('login.forgotPassword') }}</a>
              </div>
              <div class="input-wrap">
                <span class="material-symbols-outlined input-icon">lock</span>
                <el-input
                  v-model="loginForm.password"
                  type="password"
                  size="large"
                  show-password
                  auto-complete="off"
                  :placeholder="proxy.$t('login.password')"
                  class="field-input has-prefix"
                  @keyup.enter="handleLogin"
                />
              </div>
            </div>
          </el-form-item>

          <el-form-item v-if="captchaEnabled" prop="code">
            <div class="field">
              <label class="field-label">{{ proxy.$t('login.code') }}</label>
              <div class="captcha-row">
                <div class="input-wrap captcha-input">
                  <span class="material-symbols-outlined input-icon">verified_user</span>
                  <el-input
                    v-model="loginForm.code"
                    size="large"
                    auto-complete="off"
                    :placeholder="proxy.$t('login.code')"
                    class="field-input has-prefix"
                    @keyup.enter="handleLogin"
                  />
                </div>
                <div class="captcha-img-box">
                  <img :src="codeUrl" class="captcha-img" alt="captcha" @click="getCode" />
                  <button type="button" class="captcha-refresh" title="刷新验证码" @click="getCode">
                    <span class="material-symbols-outlined">refresh</span>
                  </button>
                </div>
              </div>
            </div>
          </el-form-item>

          <div class="remember-row">
            <el-checkbox v-model="loginForm.rememberMe">{{ proxy.$t('login.rememberPassword') }}</el-checkbox>
          </div>

          <el-button :loading="loading" size="large" type="primary" class="submit-btn" @click.prevent="handleLogin">
            <span v-if="!loading">{{ proxy.$t('login.login') }}</span>
            <span v-else>{{ proxy.$t('login.logging') }}</span>
            <span v-if="!loading" class="material-symbols-outlined btn-arrow">arrow_forward</span>
          </el-button>
        </el-form>

        <!-- 卡内底部支持链接 -->
        <div class="card-footer">
          <span>遇到问题？</span>
          <a href="javascript:void(0)" class="footer-link">联系技术支持</a>
        </div>
      </div>
    </main>

    <!-- 页脚 -->
    <footer class="page-footer">
      <div class="copyright">© 2018-{{ currentYear }} CallNexus. All Rights Reserved.</div>
      <nav class="footer-nav">
        <a href="javascript:void(0)">隐私政策</a>
        <a href="javascript:void(0)">服务条款</a>
        <a href="javascript:void(0)">支持中心</a>
      </nav>
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

const title = import.meta.env.VITE_APP_TITLE;
const userStore = useUserStore();
const router = useRouter();
const { t } = useI18n();

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
        const redirectUrl = redirect.value || '/';
        await router.push(redirectUrl);
        loading.value = false;
      } else {
        loading.value = false;
        if (captchaEnabled.value) {
          await getCode();
        }
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
  getCode();
  initTenantList();
  getLoginData();
});
</script>

<style lang="scss" scoped>
/* 引入 Material Symbols 图标字体（轻量、按需加载） */
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap');

/* ========== 设计 token ========== */
$primary: #1e3a8a;            // 主色（深蓝）
$primary-deep: #00236f;       // 强调色（更深）
$primary-soft: rgba(30, 58, 138, 0.08);
$on-primary: #ffffff;
$surface: #f8f9ff;
$surface-card: #ffffff;
$surface-soft: #eff4ff;
$surface-hover: #f3f6ff;
$outline: #c5c5d3;
$outline-soft: rgba(197, 197, 211, 0.45);
$on-surface: #0b1c30;
$on-surface-variant: #444651;
$muted: #757682;

/* ========== 整体 ========== */
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, $surface 0%, $surface-soft 50%, #dce9ff 100%);
  color: $on-surface;
  position: relative;
  overflow: hidden;
}

.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
  font-weight: normal;
  font-style: normal;
  font-size: 20px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
}

/* ========== 顶部 AppBar ========== */
.top-bar {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid $outline-soft;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;

  .brand-icon {
    color: $primary;
    font-size: 28px;
    font-variation-settings: 'FILL' 1;
  }
  .brand-name {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: $primary-deep;
  }
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lang-select {
  margin-right: 4px;
}

.icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: $primary;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;

  &:hover { background: $surface-soft; }
  &:active { opacity: 0.85; }

  .material-symbols-outlined {
    font-size: 22px;
  }
}

/* ========== 中间主区 ========== */
.main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  position: relative;
}

.bg-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(64px);
  opacity: 0.08;
}
.blob-l {
  width: 380px; height: 380px;
  background: $primary;
  top: -80px; left: 8%;
}
.blob-r {
  width: 320px; height: 320px;
  background: #006c49;
  bottom: -60px; right: 8%;
}

/* ========== 登录卡 ========== */
.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 500px;
  padding: 24px 32px 20px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border-radius: 16px;
  border: 1px solid rgba(197, 197, 211, 0.3);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04);
}

.card-header {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-bottom: 16px;
}

.header-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: $primary;
  color: $on-primary;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
  box-shadow: 0 6px 16px rgba(30, 58, 138, 0.25);

  .material-symbols-outlined {
    font-size: 26px;
    font-variation-settings: 'FILL' 1;
  }
}

.card-title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: $on-surface;
  margin: 0;
}

.card-desc {
  font-size: 13px;
  color: $on-surface-variant;
  margin: 0;
}

/* ========== 表单 ========== */
.login-form {
  display: flex;
  flex-direction: column;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 10px;
}
.login-form :deep(.el-form-item__error) {
  color: #ba1a1a;
  font-size: 12px;
  padding-top: 2px;
}

.field {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: $muted;
  text-transform: uppercase;
}
.field-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.field-link {
  font-size: 12px;
  font-weight: 600;
  color: $primary;
  text-decoration: none;
  &:hover { text-decoration: underline; }
}

.input-wrap {
  position: relative;
  width: 100%;

  .input-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: $muted;
    z-index: 2;
    pointer-events: none;
    font-size: 20px;
  }
}

/* Element Plus 输入框基础样式 */
.login-form :deep(.el-input__wrapper),
.login-form :deep(.el-select__wrapper) {
  background: $surface-card;
  border: 1px solid $outline;
  border-radius: 8px;
  box-shadow: none;
  height: 40px;
  padding: 0 12px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover { border-color: $primary; }
  &.is-focus {
    border-color: $primary;
    box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.15);
  }
}

/* 带图标前缀的输入框补内边距 */
.field-input.has-prefix :deep(.el-input__wrapper) {
  padding-left: 38px;
}

.login-form :deep(.el-input__inner) {
  color: $on-surface;
  font-size: 14px;
  &::placeholder { color: #9ba0b3; }
}

/* ========== 验证码 ========== */
.captcha-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
}
.captcha-input {
  flex: 1;
}
.captcha-img-box {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: $surface-soft;
  border: 1px solid $outline;
  border-radius: 8px;
  height: 40px;
}
.captcha-img {
  height: 28px;
  width: auto;
  border-radius: 4px;
  cursor: pointer;
  display: block;
}
.captcha-refresh {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: $primary;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;

  &:hover { background: rgba(255, 255, 255, 0.6); }
  .material-symbols-outlined { font-size: 18px; }
}

/* ========== 记住我 ========== */
.remember-row {
  margin: 2px 0 12px;
  :deep(.el-checkbox__label) {
    font-size: 13px;
    color: $on-surface-variant;
  }
  :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
    background: $primary;
    border-color: $primary;
  }
  :deep(.el-checkbox__inner) {
    border-color: $outline;
    border-radius: 4px;
  }
}

/* ========== 提交按钮 ========== */
.submit-btn {
  width: 100%;
  height: 42px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.01em;
  border-radius: 8px;
  border: none;
  background: $primary;
  color: $on-primary;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 6px 16px rgba(30, 58, 138, 0.25);
  transition: transform 0.15s ease, box-shadow 0.2s ease, background-color 0.2s ease;

  &:hover {
    background: $primary-deep;
    box-shadow: 0 10px 22px rgba(30, 58, 138, 0.32);
    transform: translateY(-1px);
  }
  &:active {
    transform: translateY(0);
    box-shadow: 0 4px 10px rgba(30, 58, 138, 0.25);
  }

  .btn-arrow {
    font-size: 18px;
    transition: transform 0.2s ease;
  }
  &:hover .btn-arrow { transform: translateX(2px); }
}

/* ========== 卡内底部链接 ========== */
.card-footer {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid $outline-soft;
  text-align: center;
  font-size: 13px;
  color: $on-surface-variant;

  .footer-link {
    color: $primary;
    font-weight: 500;
    margin-left: 4px;
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }
}

/* ========== 页脚 ========== */
.page-footer {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-top: 1px solid $outline-soft;

  .copyright {
    font-size: 12px;
    color: $on-surface-variant;
    letter-spacing: 0.03em;
  }
  .footer-nav {
    display: flex;
    gap: 16px;

    a {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.03em;
      color: $on-surface-variant;
      text-decoration: underline;
      transition: color 0.2s ease;
      &:hover { color: $primary; }
    }
  }
}

@media screen and (min-width: 768px) {
  .page-footer {
    flex-direction: row;
    justify-content: space-between;
  }
}

/* ========== 小屏适配 ========== */
@media screen and (max-width: 480px) {
  .login-card {
    padding: 28px 20px 22px;
    border-radius: 14px;
  }
  .card-title { font-size: 22px; }
  .header-icon { width: 56px; height: 56px; }
  .submit-btn { height: 46px; }
  .top-bar { padding: 10px 16px; }
  .brand .brand-name { font-size: 18px; }
}
</style>

