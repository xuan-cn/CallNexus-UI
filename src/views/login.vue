<template>
  <div class="login-page">
    <!-- 动态背景层 -->
    <div class="bg-layer">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
      <div class="orb orb-4"></div>
    </div>

    <!-- 左侧：品牌展示区 -->
    <div class="brand-panel">
      <div class="brand-header">
        <div class="brand-logo">
          <svg-icon icon-class="logo" v-if="false" />
          <span class="brand-mark">CN</span>
        </div>
        <span class="brand-name">CallNexus</span>
      </div>

      <div class="brand-hero">
        <h1 class="brand-title">{{ proxy.$t('login.title') }}</h1>
        <p class="brand-subtitle">{{ proxy.$t('login.subtitle') }}</p>

        <ul class="brand-features">
          <li class="feature-item"><span class="dot" />{{ proxy.$t('login.feature1') }}</li>
          <li class="feature-item"><span class="dot" />{{ proxy.$t('login.feature2') }}</li>
          <li class="feature-item"><span class="dot" />{{ proxy.$t('login.feature3') }}</li>
        </ul>
      </div>

      <!-- 脉冲波纹装饰 -->
      <div class="pulse-container">
        <span class="pulse-ring pulse-ring-1"></span>
        <span class="pulse-ring pulse-ring-2"></span>
        <span class="pulse-ring pulse-ring-3"></span>
        <span class="pulse-core"></span>
      </div>

      <div class="brand-footer">Copyright © 2018-{{ currentYear }} CallNexus. All Rights Reserved.</div>
    </div>

    <!-- 右侧：登录表单 -->
    <section class="form-panel">
      <div class="form-topbar">
        <lang-select />
      </div>

      <div class="glass-card">
        <!-- 卡片顶部装饰线 -->
        <div class="card-accent"></div>

        <el-form ref="loginRef" :model="loginForm" :rules="loginRules" class="login-form">
          <div class="form-header">
            <div class="form-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <h2 class="form-title">{{ proxy.$t('login.welcome') }}</h2>
            <p class="form-desc">{{ title }}</p>
          </div>

          <div class="form-fields">
            <el-form-item v-if="tenantEnabled" prop="tenantId">
              <el-select
                v-model="loginForm.tenantId"
                filterable
                size="large"
                :placeholder="proxy.$t('login.selectPlaceholder')"
                style="width: 100%"
              >
                <el-option v-for="item in tenantList" :key="item.tenantId" :label="item.companyName" :value="item.tenantId" />
                <template #prefix><svg-icon icon-class="company" class="el-input__icon input-icon" /></template>
              </el-select>
            </el-form-item>

            <el-form-item prop="username">
              <el-input v-model="loginForm.username" type="text" size="large" auto-complete="off" :placeholder="proxy.$t('login.username')">
                <template #prefix><svg-icon icon-class="user" class="el-input__icon input-icon" /></template>
              </el-input>
            </el-form-item>

            <el-form-item prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                size="large"
                show-password
                auto-complete="off"
                :placeholder="proxy.$t('login.password')"
                @keyup.enter="handleLogin"
              >
                <template #prefix><svg-icon icon-class="password" class="el-input__icon input-icon" /></template>
              </el-input>
            </el-form-item>

            <el-form-item v-if="captchaEnabled" prop="code">
              <div class="code-row">
                <el-input
                  v-model="loginForm.code"
                  size="large"
                  auto-complete="off"
                  :placeholder="proxy.$t('login.code')"
                  @keyup.enter="handleLogin"
                >
                  <template #prefix><svg-icon icon-class="validCode" class="el-input__icon input-icon" /></template>
                </el-input>
                <div class="login-code">
                  <img :src="codeUrl" class="login-code-img" @click="getCode" />
                </div>
              </div>
            </el-form-item>
          </div>

          <div class="form-row">
            <el-checkbox v-model="loginForm.rememberMe">{{ proxy.$t('login.rememberPassword') }}</el-checkbox>
            <a class="link-type" href="javascript:void(0)">{{ proxy.$t('login.forgotPassword') }}</a>
          </div>

          <el-button :loading="loading" size="large" type="primary" class="login-btn" @click.prevent="handleLogin">
            <span v-if="!loading">{{ proxy.$t('login.login') }}</span>
            <span v-else>{{ proxy.$t('login.logging') }}</span>
          </el-button>

          <div v-if="register" class="register-row">
            <span>{{ proxy.$t('login.noAccount') }}</span>
            <router-link class="link-type" :to="'/register'">{{ proxy.$t('login.switchRegisterPage') }}</router-link>
          </div>

          <div class="social-divider"><span>{{ proxy.$t('login.otherLogin') }}</span></div>
        </el-form>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { getCodeImg, getTenantList } from '@/api/login';
import { authRouterUrl } from '@/api/system/social/auth';
import { useUserStore } from '@/store/modules/user';
import { LoginData, TenantVO } from '@/api/types';
import { to } from 'await-to-js';
import { HttpStatus } from '@/enums/RespEnum';
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
// 验证码开关
const captchaEnabled = ref(true);
// 租户开关
const tenantEnabled = ref(true);

// 注册开关
const register = ref(false);
const redirect = ref('/');
const loginRef = ref<ElFormInstance>();
// 租户列表
const tenantList = ref<TenantVO[]>([]);
// 当前年份（用于版权信息）
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
      // 勾选了需要记住密码设置在 localStorage 中设置记住用户名和密码
      if (loginForm.value.rememberMe) {
        localStorage.setItem('tenantId', String(loginForm.value.tenantId));
        localStorage.setItem('username', String(loginForm.value.username));
        localStorage.setItem('password', String(loginForm.value.password));
        localStorage.setItem('rememberMe', String(loginForm.value.rememberMe));
      } else {
        // 否则移除
        localStorage.removeItem('tenantId');
        localStorage.removeItem('username');
        localStorage.removeItem('password');
        localStorage.removeItem('rememberMe');
      }
      // 调用action的登录方法
      const [err] = await to(userStore.login(loginForm.value));
      if (!err) {
        const redirectUrl = redirect.value || '/';
        await router.push(redirectUrl);
        loading.value = false;
      } else {
        loading.value = false;
        // 重新获取验证码
        if (captchaEnabled.value) {
          await getCode();
        }
      }
    } else {
      console.log('error submit!', fields);
    }
  });
};

/**
 * 获取验证码
 */
const getCode = async () => {
  const res = await getCodeImg();
  const { data } = res;
  captchaEnabled.value = data.captchaEnabled === undefined ? true : data.captchaEnabled;
  if (captchaEnabled.value) {
    // 刷新验证码时清空输入框
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

/**
 * 获取租户列表
 */
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

/**
 * 第三方登录
 * @param type
 */
const doSocialLogin = (type: string) => {
  authRouterUrl(type, loginForm.value.tenantId).then((res: any) => {
    if (res.code === HttpStatus.SUCCESS) {
      // 获取授权地址跳转
      window.location.href = res.data;
    } else {
      ElMessage.error(res.msg);
    }
  });
};

onMounted(() => {
  getCode();
  initTenantList();
  getLoginData();
});
</script>

<style lang="scss" scoped>
/* ========== CSS Keyframe Animations ========== */
@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-30px) scale(1.05); }
}

@keyframes pulse-ring {
  0% {
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 0.6;
  }
  100% {
    transform: translate(-50%, -50%) scale(2.5);
    opacity: 0;
  }
}

@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes glow {
  0%, 100% { box-shadow: 0 0 8px rgba(37, 99, 235, 0.4), 0 0 24px rgba(37, 99, 235, 0.1); }
  50% { box-shadow: 0 0 16px rgba(37, 99, 235, 0.5), 0 0 48px rgba(37, 99, 235, 0.15); }
}

/* ========== 整体布局 ========== */
.login-page {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 100vh;
  background: linear-gradient(-45deg, #0a1628, #0f1f3d, #132a4a, #0d1b2e);
  background-size: 400% 400%;
  animation: gradient-shift 15s ease infinite;
  overflow: hidden;
}

/* ========== 动态背景光斑 ========== */
.bg-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
}

.orb-1 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(30, 64, 175, 0.6) 0%, transparent 70%);
  top: -10%;
  left: -5%;
  animation: float 8s ease-in-out infinite;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(37, 99, 235, 0.45) 0%, transparent 70%);
  bottom: -10%;
  right: -5%;
  animation: float 10s ease-in-out infinite 2s;
}

.orb-3 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(29, 78, 216, 0.4) 0%, transparent 70%);
  top: 50%;
  left: 40%;
  animation: float 12s ease-in-out infinite 4s;
}

.orb-4 {
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%);
  top: 20%;
  right: 20%;
  animation: float 9s ease-in-out infinite 1s;
}

/* ========== 左侧品牌区 ========== */
.brand-panel {
  position: relative;
  flex: 0 0 52%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 40px 48px;
  color: #fff;
  z-index: 1;
  overflow: hidden;
}

.brand-header {
  display: flex;
  align-items: center;
  gap: 12px;
  animation: fade-in-up 0.8s ease-out both;
}

.brand-logo {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  .brand-mark {
    font-weight: 700;
    font-size: 16px;
    letter-spacing: 0.5px;
    color: #fff;
  }
}

.brand-name {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 1.5px;
  background: linear-gradient(135deg, #fff 0%, #93c5fd 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-hero {
  margin-top: auto;
  margin-bottom: auto;
  animation: fade-in-up 0.8s ease-out 0.2s both;
}

.brand-title {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #ffffff 0%, #bfdbfe 50%, #93c5fd 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-subtitle {
  font-size: 16px;
  opacity: 0.75;
  line-height: 1.6;
  margin-bottom: 32px;
  color: #bfdbfe;
}

.brand-features {
  list-style: none;
  padding: 0;
  margin: 0;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  opacity: 0;
  margin-bottom: 14px;
  color: rgba(255, 255, 255, 0.88);
  animation: fade-in-up 0.6s ease-out both;

  &:nth-child(1) { animation-delay: 0.5s; }
  &:nth-child(2) { animation-delay: 0.7s; }
  &:nth-child(3) { animation-delay: 0.9s; }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: linear-gradient(135deg, #60a5fa, #2563eb);
    flex-shrink: 0;
    box-shadow: 0 0 8px rgba(37, 99, 235, 0.5);
  }
}

/* 脉冲波纹 - 呼叫信号意象 */
.pulse-container {
  position: absolute;
  bottom: 80px;
  right: 60px;
  width: 120px;
  height: 120px;
}

.pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 60px;
  height: 60px;
  border: 2px solid rgba(37, 99, 235, 0.4);
  border-radius: 50%;
  animation: pulse-ring 3s ease-out infinite;
}

.pulse-ring-1 { animation-delay: 0s; }
.pulse-ring-2 { animation-delay: 1s; }
.pulse-ring-3 { animation-delay: 2s; }

.pulse-core {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, #60a5fa, #2563eb);
  border-radius: 50%;
  box-shadow: 0 0 12px rgba(37, 99, 235, 0.6);
}

.brand-footer {
  font-size: 13px;
  opacity: 0.5;
  color: #bfdbfe;
  animation: fade-in-up 0.8s ease-out 1.2s both;
}

/* ========== 右侧表单区 ========== */
.form-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1;
  padding: 24px;
  position: relative;
}

.form-topbar {
  position: absolute;
  top: 24px;
  right: 40px;
  z-index: 2;
}

/* 玻璃拟态卡片 */
.glass-card {
  position: relative;
  width: 100%;
  max-width: 420px;
  padding: 48px 40px 40px;
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow:
    0 24px 48px rgba(0, 0, 0, 0.25),
    0 4px 12px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  animation: fade-in-up 0.8s ease-out 0.3s both;
  overflow: hidden;
}

/* 卡片顶部渐变装饰线 */
.card-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #1e40af, #2563eb, #60a5fa, #1e40af);
  background-size: 200% 100%;
  animation: gradient-shift 4s ease infinite;
}

.login-form {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.form-header {
  text-align: center;
  margin-bottom: 32px;
  animation: fade-in-up 0.6s ease-out 0.5s both;
}

.form-avatar {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(30, 64, 175, 0.3), rgba(37, 99, 235, 0.25));
  border: 1px solid rgba(37, 99, 235, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 28px;
    height: 28px;
    color: #93c5fd;
  }
}

.form-title {
  font-size: 24px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 6px;
  letter-spacing: 0.5px;
}

.form-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
}

/* 表单字段区域 */
.form-fields {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 20px;
}

/* 表单项 */
.login-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.login-form :deep(.el-form-item__error) {
  color: #f87171;
  font-size: 12px;
  padding-top: 2px;
}

.login-form :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: none;
  padding: 4px 12px;
  height: 44px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    border-color: rgba(37, 99, 235, 0.4);
    background: rgba(255, 255, 255, 0.08);
  }

  &.is-focus {
    border-color: rgba(37, 99, 235, 0.7);
    background: rgba(255, 255, 255, 0.1);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  }
}

.login-form :deep(.el-input__inner) {
  color: #fff;
  font-size: 14px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }
}

.login-form :deep(.el-input__prefix) {
  margin-right: 4px;
}

.login-form :deep(.el-select__wrapper) {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: none;
  height: 44px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    border-color: rgba(37, 99, 235, 0.4);
    background: rgba(255, 255, 255, 0.08);
  }

  &.is-focus {
    border-color: rgba(37, 99, 235, 0.7);
    background: rgba(255, 255, 255, 0.1);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  }
}

/* 密码框眼睛图标 */
.login-form :deep(.el-input__suffix) {
  color: rgba(255, 255, 255, 0.4);

  &:hover {
    color: rgba(255, 255, 255, 0.7);
  }
}

/* 输入框图标 */
.input-icon {
  width: 18px;
  height: 18px;
  color: rgba(255, 255, 255, 0.4);
}

/* 验证码行 */
.code-row {
  display: flex;
  gap: 12px;
  align-items: center;
  .el-input {
    flex: 1;
  }
}

.login-code {
  flex-shrink: 0;
}

.login-code-img {
  height: 44px;
  cursor: pointer;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  transition: border-color 0.2s;

  &:hover {
    border-color: rgba(37, 99, 235, 0.4);
  }
}

/* 记住密码 & 忘记密码 */
.form-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  :deep(.el-checkbox__label) {
    color: rgba(255, 255, 255, 0.6);
    font-size: 13px;
  }

  :deep(.el-checkbox__inner) {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }

  :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
    background: #2563eb;
    border-color: #2563eb;
  }
}

.link-type {
  font-size: 13px;
  color: #93c5fd;
  text-decoration: none;
  transition: color 0.2s;
  &:hover {
    color: #bfdbfe;
  }
}

/* 登录按钮 */
.login-btn {
  width: 100%;
  height: 48px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 1px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
  color: #fff;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: glow 3s ease-in-out infinite;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%);
    border-radius: inherit;
  }

  &:hover {
    background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(37, 99, 235, 0.35);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
  }
}

/* 注册提示 */
.register-row {
  text-align: center;
  margin-top: 20px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);

  .link-type {
    margin-left: 4px;
    font-weight: 500;
  }
}

/* 社交登录分割线 */
.social-divider {
  display: flex;
  align-items: center;
  margin: 24px 0 0;
  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
  }
  span {
    padding: 0 16px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.35);
    white-space: nowrap;
  }
}

/* ========== 响应式适配 ========== */
@media screen and (max-width: 1200px) {
  .brand-panel {
    flex-basis: 48%;
    padding: 32px 40px;
  }
  .brand-title {
    font-size: 28px;
  }
  .glass-card {
    padding: 40px 32px 36px;
  }
}

@media screen and (max-width: 992px) {
  .brand-panel {
    display: none;
  }
  .form-panel {
    flex: 1;
    max-width: 100%;
  }
  .glass-card {
    max-width: 440px;
  }
}

@media screen and (max-width: 576px) {
  .form-panel {
    padding: 16px;
  }
  .glass-card {
    padding: 32px 24px 28px;
    border-radius: 20px;
  }
  .form-title {
    font-size: 20px;
  }
  .form-avatar {
    width: 48px;
    height: 48px;
    svg {
      width: 24px;
      height: 24px;
    }
  }
  .login-btn {
    height: 44px;
  }
}

/* ========== 暗色主题微调 ========== */
.dark .login-page {
  background: linear-gradient(-45deg, #030712, #0a1628, #0c1a30, #050d18);
  background-size: 400% 400%;
  animation: gradient-shift 15s ease infinite;
}

.dark .glass-card {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
}

.dark .login-form :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.06);
}
</style>
