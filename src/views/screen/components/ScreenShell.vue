<template>
  <div ref="shellRef" class="screen-shell">
    <div class="screen-bg">
      <div class="screen-aurora" />
      <div class="screen-grid" />
      <div class="screen-noise" />
      <div class="screen-vignette" />
      <div class="screen-scanline" />
      <div class="screen-glow screen-glow-center" />
      <div class="screen-glow screen-glow-left" />
      <div class="screen-glow screen-glow-right" />
    </div>

    <header class="screen-header">
      <div class="screen-header-frame">
        <span class="screen-header-bar screen-header-bar-l" />
        <span class="screen-header-bar screen-header-bar-r" />
        <span class="screen-header-dash screen-header-dash-l" />
        <span class="screen-header-dash screen-header-dash-r" />
      </div>
      <div class="screen-header-side screen-header-left">
        <span class="screen-date">{{ dateText }}</span>
        <span class="screen-badge" :class="badgeClass">{{ resolvedBadge }}</span>
        <span
          v-for="link in resolvedSwitches"
          :key="link.path"
          class="screen-switch"
          @click="goSwitch(link.path)"
        >{{ link.label }}</span>
      </div>
      <div class="screen-header-center">
        <div class="screen-title-plate">
          <div class="screen-title-ornament screen-title-ornament-left">
            <i /><i /><i />
          </div>
          <div class="screen-title-core">
            <h1 class="screen-title">{{ title }}</h1>
            <p v-if="subtitle" class="screen-subtitle">{{ subtitle }}</p>
          </div>
          <div class="screen-title-ornament screen-title-ornament-right">
            <i /><i /><i />
          </div>
        </div>
      </div>
      <div class="screen-header-side screen-header-right">
        <span class="screen-clock">{{ clockText }}</span>
        <button v-if="screenfullEnabled" class="screen-btn" type="button" @click="toggleFullscreen">
          {{ isFullscreen ? exitFullscreenText : fullscreenText }}
        </button>
        <button class="screen-btn screen-btn-ghost" type="button" @click="goBack">{{ backText }}</button>
      </div>
    </header>

    <main class="screen-body">
      <slot />
    </main>

    <footer class="screen-footer">
      <span>{{ footerText }}</span>
      <span>{{ footerRefreshText }} {{ refreshTime }}</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import screenfull from 'screenfull';
import { useRouter } from 'vue-router';

const props = defineProps<{
  title: string;
  subtitle?: string;
  footerText?: string;
  badgeText?: string;
  badgeTone?: 'demo' | 'live' | 'loading';
  switchTo?: { label: string; path: string };
  switchLinks?: { label: string; path: string }[];
}>();

const router = useRouter();
const resolvedSwitches = computed(() => {
  if (props.switchLinks?.length) return props.switchLinks;
  return props.switchTo ? [props.switchTo] : [];
});

const shellRef = ref<HTMLElement>();
const clockText = ref('');
const dateText = ref('');
const refreshTime = ref('');
const isFullscreen = ref(false);
const screenfullEnabled = screenfull.isEnabled;

const loadingBadgeText = '\u52a0\u8f7d\u4e2d';
const liveBadgeText = '\u5b9e\u65f6\u6570\u636e';
const failBadgeText = '\u6570\u636e\u5f02\u5e38';
const resolvedBadge = computed(() => {
  if (props.badgeText) return props.badgeText;
  if (props.badgeTone === 'live') return liveBadgeText;
  if (props.badgeTone === 'demo') return failBadgeText;
  if (props.badgeTone === 'loading') return loadingBadgeText;
  return loadingBadgeText;
});
const badgeClass = computed(() => ({
  'is-live': props.badgeTone === 'live',
  'is-loading': !props.badgeTone || props.badgeTone === 'loading'
}));
const exitFullscreenText = '\u9000\u51fa\u5168\u5c4f';
const fullscreenText = '\u5168\u5c4f';
const backText = '\u8fd4\u56de\u7cfb\u7edf';
const footerRefreshText = '\u6570\u636e\u5237\u65b0\u65f6\u95f4';

let clockTimer: number | undefined;

const pad = (value: number) => `${value}`.padStart(2, '0');

const weekDays = ['\u65e5', '\u4e00', '\u4e8c', '\u4e09', '\u56db', '\u4e94', '\u516d'];

const updateClock = () => {
  const now = new Date();
  dateText.value = `${now.getFullYear()}\u5e74${pad(now.getMonth() + 1)}\u6708${pad(now.getDate())}\u65e5 \u5468${weekDays[now.getDay()]}`;
  clockText.value = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  refreshTime.value = clockText.value;
};

const toggleFullscreen = async () => {
  if (!screenfull.isEnabled || !shellRef.value) return;
  await screenfull.toggle(shellRef.value);
};

const onFullscreenChange = () => {
  isFullscreen.value = screenfull.isEnabled && screenfull.isFullscreen;
};

const goSwitch = (path?: string) => {
  if (path) router.push(path);
};

const goBack = () => {
  router.push('/index');
};

onMounted(() => {
  updateClock();
  clockTimer = window.setInterval(updateClock, 1000);
  if (screenfull.isEnabled) {
    screenfull.on('change', onFullscreenChange);
  }
  document.documentElement.classList.add('screen-route-active');
});

onBeforeUnmount(() => {
  if (clockTimer) window.clearInterval(clockTimer);
  if (screenfull.isEnabled) {
    screenfull.off('change', onFullscreenChange);
  }
  document.documentElement.classList.remove('screen-route-active');
});
</script>

<style lang="scss">
html.screen-route-active,
html.screen-route-active body,
html.screen-route-active #app {
  overflow: hidden !important;
  height: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  background: #030a16 !important;
}

html.screen-route-active #app > * {
  min-height: 100%;
}
</style>

<style scoped lang="scss">
.screen-shell {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  max-height: 100dvh;
  overflow: hidden;
  isolation: isolate;
  color: #b8d4ea;
  background:
    radial-gradient(ellipse 90% 55% at 50% -10%, rgba(18, 70, 140, 0.55), transparent 55%),
    radial-gradient(ellipse 50% 40% at 15% 80%, rgba(0, 60, 120, 0.28), transparent 50%),
    radial-gradient(ellipse 45% 35% at 88% 70%, rgba(0, 90, 130, 0.2), transparent 50%),
    linear-gradient(180deg, #061428 0%, #040e1c 42%, #030a16 100%);
}

.screen-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.screen-aurora {
  position: absolute;
  inset: -20%;
  background:
    conic-gradient(from 210deg at 30% 40%, transparent 0deg, rgba(0, 120, 220, 0.07) 40deg, transparent 90deg),
    conic-gradient(from 40deg at 70% 55%, transparent 0deg, rgba(0, 180, 200, 0.05) 50deg, transparent 110deg);
  filter: blur(60px);
  animation: screen-aurora-drift 18s ease-in-out infinite alternate;
}

@keyframes screen-aurora-drift {
  from { transform: translate(-2%, -1%) rotate(0deg); opacity: 0.7; }
  to { transform: translate(2%, 2%) rotate(8deg); opacity: 1; }
}

.screen-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(40, 130, 200, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(40, 130, 200, 0.045) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 80% 70% at 50% 45%, #000 10%, transparent 78%);
  opacity: 0.9;
}

.screen-noise {
  position: absolute;
  inset: 0;
  opacity: 0.045;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 180px 180px;
  mix-blend-mode: overlay;
}

.screen-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 75% 70% at 50% 45%, transparent 35%, rgba(0, 4, 12, 0.55) 100%);
}

.screen-scanline {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 140, 220, 0.012) 2px,
    rgba(0, 140, 220, 0.012) 3px
  );
  opacity: 0.7;
}

.screen-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  pointer-events: none;
}

.screen-glow-center {
  top: 18%;
  left: 50%;
  width: 520px;
  height: 280px;
  background: rgba(20, 90, 180, 0.16);
  transform: translate(-50%, -50%);
}

.screen-glow-left {
  top: -100px;
  left: -60px;
  width: 360px;
  height: 360px;
  background: rgba(0, 70, 160, 0.22);
}

.screen-glow-right {
  right: -80px;
  bottom: -100px;
  width: 380px;
  height: 380px;
  background: rgba(0, 130, 160, 0.14);
}

.screen-header {
  position: relative;
  z-index: 2;
  display: grid;
  flex-shrink: 0;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  min-height: 56px;
  padding: 4px 16px 8px;
  background: linear-gradient(180deg, rgba(5, 18, 42, 0.98) 0%, rgba(3, 12, 28, 0.35) 100%);
}

.screen-header-frame {
  position: absolute;
  inset: auto 0 0;
  height: 12px;
  pointer-events: none;
}

.screen-header-bar {
  position: absolute;
  bottom: 0;
  width: 34%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #3de7ff 40%, #7dd8ff 50%, #3de7ff 60%, transparent);
  box-shadow: 0 0 16px rgba(61, 231, 255, 0.55);
}

.screen-header-bar-l { left: 4%; }
.screen-header-bar-r { right: 4%; }

.screen-header-dash {
  position: absolute;
  bottom: 6px;
  width: 22%;
  height: 1px;
  background: repeating-linear-gradient(90deg, rgba(61, 231, 255, 0.55) 0 8px, transparent 8px 14px);
  opacity: 0.55;
}

.screen-header-dash-l { left: 10%; }
.screen-header-dash-r { right: 10%; }

.screen-header-side {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex-wrap: nowrap;
}

.screen-header-left {
  justify-content: flex-start;
  overflow: hidden;
}
.screen-header-right { justify-content: flex-end; }
.screen-header-center {
  display: flex;
  justify-content: center;
  text-align: center;
  padding: 0 8px;
}

.screen-date {
  color: rgba(90, 180, 220, 0.75);
  font-size: 11px;
  white-space: nowrap;
  letter-spacing: 0.3px;
}

.screen-title-plate {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 14px 6px;
  background: linear-gradient(180deg, rgba(14, 55, 110, 0.55) 0%, rgba(6, 24, 55, 0.15) 100%);
  clip-path: polygon(12px 0, calc(100% - 12px) 0, 100% 100%, 0 100%);
  box-shadow:
    inset 0 -1px 0 rgba(61, 231, 255, 0.45),
    inset 0 -12px 28px rgba(0, 110, 210, 0.12),
    0 0 28px rgba(0, 120, 220, 0.1);
}

.screen-title-plate::before,
.screen-title-plate::after {
  content: '';
  position: absolute;
  bottom: 0;
  width: 28%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #3de7ff);
  box-shadow: 0 0 12px rgba(61, 231, 255, 0.6);
}

.screen-title-plate::before { left: 8%; }
.screen-title-plate::after {
  right: 8%;
  background: linear-gradient(90deg, #3de7ff, transparent);
}

.screen-title-ornament {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 24px;
}

.screen-title-ornament i {
  display: block;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(61, 231, 255, 0.85));
  box-shadow: 0 0 8px rgba(61, 231, 255, 0.45);
}

.screen-title-ornament i:nth-child(1) { width: 100%; opacity: 1; }
.screen-title-ornament i:nth-child(2) { width: 72%; opacity: 0.7; }
.screen-title-ornament i:nth-child(3) { width: 44%; opacity: 0.4; }

.screen-title-ornament-left i {
  margin-left: auto;
  background: linear-gradient(90deg, transparent, rgba(61, 231, 255, 0.9));
}

.screen-title-ornament-right { transform: scaleX(-1); }

.screen-title-core {
  min-width: 0;
  padding: 0 4px;
}

.screen-badge {
  padding: 2px 8px;
  border: 1px solid rgba(220, 160, 40, 0.4);
  background: rgba(180, 100, 0, 0.12);
  color: #e8c060;
  font-size: 10px;
  letter-spacing: 0.5px;
  white-space: nowrap;
  flex-shrink: 0;
}

.screen-badge.is-live {
  border-color: rgba(61, 214, 165, 0.45);
  background: rgba(20, 120, 90, 0.16);
  color: #6ee7b7;
}

.screen-badge.is-loading {
  border-color: rgba(61, 191, 255, 0.4);
  background: rgba(20, 80, 140, 0.18);
  color: #7dd8ff;
}

.screen-switch {
  padding: 3px 8px;
  border: 1px solid rgba(40, 160, 210, 0.35);
  background: linear-gradient(180deg, rgba(0, 70, 140, 0.35), rgba(0, 40, 90, 0.2));
  color: #5fd4f0;
  font-size: 11px;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.screen-switch:hover {
  border-color: rgba(61, 231, 255, 0.55);
  box-shadow: 0 0 18px rgba(0, 180, 255, 0.22);
}

.screen-title {
  margin: 0;
  background: linear-gradient(180deg, #f5fbff 0%, #8fdcff 48%, #2eb8ff 100%);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  font-size: clamp(18px, 2.1vw, 26px);
  font-weight: 700;
  letter-spacing: 0.35em;
  line-height: 1.1;
  filter: drop-shadow(0 0 16px rgba(0, 180, 255, 0.45));
}

.screen-subtitle {
  margin: 2px 0 0;
  color: rgba(70, 140, 180, 0.55);
  font-size: clamp(8px, 0.75vw, 10px);
  letter-spacing: 0.28em;
  white-space: nowrap;
}

.screen-clock {
  padding: 3px 10px;
  border: 1px solid rgba(40, 150, 200, 0.28);
  background: rgba(4, 20, 45, 0.7);
  color: #3de7ff;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1px;
  text-shadow: 0 0 12px rgba(0, 210, 255, 0.45);
  box-shadow: inset 0 0 12px rgba(0, 80, 150, 0.25);
  white-space: nowrap;
  flex-shrink: 0;
}

.screen-btn {
  padding: 3px 10px;
  border: 1px solid rgba(40, 150, 200, 0.38);
  background: linear-gradient(180deg, rgba(0, 70, 140, 0.4), rgba(0, 35, 80, 0.3));
  color: #c8e4f5;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: box-shadow 0.2s ease;
}

.screen-btn:hover { box-shadow: 0 0 14px rgba(0, 180, 255, 0.28); }

.screen-btn-ghost {
  border-color: rgba(80, 120, 160, 0.28);
  background: transparent;
  color: rgba(140, 180, 210, 0.75);
}

.screen-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  padding: 6px 14px 6px;
}

.screen-footer {
  position: relative;
  z-index: 2;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 4px 18px 6px;
  border-top: 1px solid rgba(40, 120, 180, 0.15);
  background: rgba(3, 12, 28, 0.72);
  color: rgba(90, 140, 180, 0.65);
  font-size: 11px;
  letter-spacing: 0.3px;
}

.screen-footer::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 220px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(61, 231, 255, 0.5), transparent);
  transform: translateX(-50%);
  box-shadow: 0 0 10px rgba(0, 210, 255, 0.3);
}
</style>
