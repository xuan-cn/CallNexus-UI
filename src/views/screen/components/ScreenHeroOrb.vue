<template>
  <div class="hero" :class="[`is-${theme}`, { 'is-empty': isEmpty }]">
    <div class="hero-layout">
      <div v-if="displaySatellites.length" class="hero-sats">
        <div
          v-for="(item, index) in displaySatellites"
          :key="`${item.label}-${index}`"
          class="hero-sat"
          :class="`is-tone-${index}`"
        >
          <span class="hero-sat-label">{{ item.label }}</span>
          <strong class="hero-sat-value" :style="item.color ? { color: item.color } : undefined">{{ item.value }}</strong>
        </div>
      </div>

      <div class="hero-visual">
        <div class="hero-bloom" aria-hidden="true" />
        <div class="hero-floor" aria-hidden="true" />
        <div class="hero-orbit" aria-hidden="true"><i /><i /></div>

        <svg v-if="theme === 'ops'" class="hero-svg" viewBox="0 0 360 360" aria-hidden="true">
          <defs>
            <radialGradient :id="`${uid}-core`" cx="36%" cy="30%" r="70%">
              <stop offset="0%" stop-color="#e8fcff" stop-opacity="0.55" />
              <stop offset="35%" stop-color="#3ec8ef" stop-opacity="0.28" />
              <stop offset="70%" stop-color="#0a5a88" stop-opacity="0.18" />
              <stop offset="100%" stop-color="#031018" stop-opacity="0" />
            </radialGradient>
            <linearGradient :id="`${uid}-arc`" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#1a8ab8" stop-opacity="0.2" />
              <stop offset="42%" stop-color="#7af6ff" stop-opacity="1" />
              <stop offset="100%" stop-color="#ffc05a" stop-opacity="0.75" />
            </linearGradient>
            <filter :id="`${uid}-glow`" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <circle cx="180" cy="180" r="108" :fill="`url(#${uid}-core)`" class="hero-core-fill" />

          <!-- tick marks -->
          <g class="hero-ticks" stroke="rgba(150,230,255,0.55)" stroke-width="1.4" stroke-linecap="round">
            <line
              v-for="i in 48"
              :key="`t-${i}`"
              x1="180"
              :y1="i % 4 === 0 ? 46 : 52"
              x2="180"
              :y2="i % 4 === 0 ? 60 : 56"
              :transform="`rotate(${(i - 1) * 7.5} 180 180)`"
              :opacity="i % 4 === 0 ? 0.75 : 0.28"
            />
          </g>

          <circle cx="180" cy="180" r="118" fill="none" stroke="rgba(50,140,190,0.28)" stroke-width="10" />
          <circle
            class="hero-progress"
            :class="{ 'is-demo': isEmpty }"
            cx="180"
            cy="180"
            r="118"
            fill="none"
            :stroke="`url(#${uid}-arc)`"
            stroke-width="10"
            stroke-linecap="round"
            :stroke-dasharray="arcLen"
            :stroke-dashoffset="visualArcOffset"
            transform="rotate(-90 180 180)"
            :filter="`url(#${uid}-glow)`"
          />
          <circle
            cx="180"
            cy="180"
            r="96"
            fill="none"
            stroke="rgba(120,230,255,0.2)"
            stroke-width="1"
            stroke-dasharray="4 8"
            class="hero-dash"
          />
          <circle cx="180" cy="180" r="78" fill="none" stroke="rgba(94,220,255,0.12)" stroke-width="1" />

          <g :filter="`url(#${uid}-glow)`">
            <circle r="4" fill="#8af4ff">
              <animateMotion dur="8.5s" repeatCount="indefinite" path="M180 50 A130 130 0 1 1 179.9 50" />
            </circle>
            <circle r="3" fill="#ffc05a">
              <animateMotion dur="11.5s" begin="0.8s" repeatCount="indefinite" path="M180 62 A118 118 0 1 0 180.1 62" />
            </circle>
          </g>
        </svg>

        <svg v-else class="hero-svg" viewBox="0 0 360 360" aria-hidden="true">
          <defs>
            <linearGradient :id="`${uid}-hex`" x1="22%" y1="8%" x2="82%" y2="95%">
              <stop offset="0%" stop-color="#f2eaff" stop-opacity="0.62" />
              <stop offset="40%" stop-color="#9470e8" stop-opacity="0.42" />
              <stop offset="100%" stop-color="#140820" stop-opacity="0.14" />
            </linearGradient>
            <linearGradient :id="`${uid}-ai-arc`" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#3dd6a5" stop-opacity="0.35" />
              <stop offset="50%" stop-color="#d8c2ff" stop-opacity="1" />
              <stop offset="100%" stop-color="#6ec8ff" stop-opacity="0.45" />
            </linearGradient>
            <filter :id="`${uid}-ai-glow`" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <polygon
            points="180,30 310,106 310,246 180,322 50,246 50,106"
            fill="none"
            stroke="rgba(190,160,255,0.32)"
            stroke-width="1.4"
            stroke-dasharray="8 7"
            class="hero-hex-spin"
          />
          <polygon
            points="180,50 290,116 290,236 180,302 70,236 70,116"
            fill="none"
            :stroke="`url(#${uid}-ai-arc)`"
            stroke-width="6"
            stroke-linejoin="round"
            :stroke-dasharray="hexLen"
            :stroke-dashoffset="visualHexOffset"
            :filter="`url(#${uid}-ai-glow)`"
            class="hero-progress"
            :class="{ 'is-demo': isEmpty }"
          />
          <polygon
            points="180,82 266,134 266,230 180,282 94,230 94,134"
            :fill="`url(#${uid}-hex)`"
            :filter="`url(#${uid}-ai-glow)`"
            class="hero-hex-core"
          />
          <polygon
            points="180,82 266,134 266,230 180,282 94,230 94,134"
            fill="none"
            stroke="rgba(220,200,255,0.6)"
            stroke-width="1.5"
          />
          <path d="M180 82 L180 282 M94 134 L266 230 M266 134 L94 230" fill="none" stroke="rgba(210,190,255,0.14)" stroke-width="1" />

          <g :filter="`url(#${uid}-ai-glow)`">
            <rect
              v-for="(h, i) in eqBars"
              :key="i"
              :x="110 + i * 11.5"
              :y="252 - h"
              width="6"
              :height="h"
              rx="2"
              :fill="i % 3 === 1 ? '#3dd6a5' : '#cbb6ff'"
              :class="`eq eq-${i}`"
            />
          </g>
        </svg>

        <div class="hero-glass" aria-hidden="true" />
        <div class="hero-copy">
          <div class="hero-value">{{ valueText }}</div>
          <div class="hero-label">{{ label }}</div>
          <div class="hero-sub">{{ displaySub }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export type HeroOrbTheme = 'ops' | 'exhibit';

export interface HeroOrbSatellite {
  label: string;
  value: string;
  color?: string;
}

const props = withDefaults(
  defineProps<{
    theme?: HeroOrbTheme;
    percent?: number;
    valueText: string;
    label: string;
    sub?: string;
    satellites?: HeroOrbSatellite[];
  }>(),
  {
    theme: 'ops',
    percent: 0,
    sub: '',
    satellites: () => []
  }
);

const uid = `hero-${Math.random().toString(36).slice(2, 8)}`;
const displaySatellites = computed(() => props.satellites.slice(0, 4));

const safePercent = computed(() => Math.min(100, Math.max(0, Number(props.percent) || 0)));
const isEmpty = computed(() => safePercent.value <= 0);
const visualPercent = computed(() => (isEmpty.value ? 22 : safePercent.value));

const ARC_R = 118;
const arcLen = 2 * Math.PI * ARC_R;
const visualArcOffset = computed(() => arcLen * (1 - visualPercent.value / 100));

const hexLen = 6 * 138;
const visualHexOffset = computed(() => hexLen * (1 - visualPercent.value / 100));

const displaySub = computed(() => {
  if (isEmpty.value) {
    if (props.sub && props.sub !== '----') return props.sub;
    // ????????? / ??????????
    return props.theme === 'exhibit' ? '\u7b49\u5f85\u4f1a\u8bdd\u63a5\u5165' : '\u7b49\u5f85\u8bdd\u52a1\u63a5\u5165';
  }
  return props.sub || '';
});

const eqBars = [14, 24, 38, 20, 46, 28, 40, 16, 34, 22, 42, 18];
</script>

<style scoped lang="scss">
.hero {
  --accent: #3de7ff;
  --accent-2: #ffb84d;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.hero.is-exhibit {
  --accent: #b49bff;
  --accent-2: #3dd6a5;
}

.hero-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 10px;
  padding: 4px 2px 2px;
  box-sizing: border-box;
}

.hero-sats {
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.hero-sat {
  position: relative;
  min-width: 0;
  padding: 9px 10px 10px 12px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  background: linear-gradient(145deg, rgba(8, 32, 58, 0.82), rgba(3, 12, 28, 0.7));
  box-shadow:
    inset 0 1px 0 rgba(180, 230, 255, 0.08),
    0 6px 16px rgba(0, 0, 0, 0.22);
  text-align: left;
}

.hero-sat::before {
  content: '';
  position: absolute;
  top: 0;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 70%, #fff), transparent);
}

.hero-sat::after {
  content: '';
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 0;
  width: 2px;
  background: linear-gradient(180deg, var(--sat-tone, var(--accent)), transparent 90%);
  box-shadow: 0 0 8px var(--sat-tone, var(--accent));
}

.hero-sat.is-tone-0 { --sat-tone: #2ecbff; }
.hero-sat.is-tone-1 { --sat-tone: #ffb84d; }
.hero-sat.is-tone-2 { --sat-tone: #3dd6a5; }
.hero-sat.is-tone-3 { --sat-tone: #6aa8ff; }

.is-exhibit .hero-sat.is-tone-0 { --sat-tone: #b49bff; }
.is-exhibit .hero-sat.is-tone-1 { --sat-tone: #ff7a6e; }
.is-exhibit .hero-sat.is-tone-2 { --sat-tone: #6ec8ff; }
.is-exhibit .hero-sat.is-tone-3 { --sat-tone: #3dd6a5; }

.is-ops .hero-sat {
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
}

.is-exhibit .hero-sat {
  border-radius: 10px;
  background: linear-gradient(145deg, rgba(46, 28, 88, 0.84), rgba(12, 8, 30, 0.72));
}

.hero-sat-label {
  display: block;
  color: rgba(170, 200, 225, 0.78);
  font-size: 11px;
  letter-spacing: 0.04em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.is-exhibit .hero-sat-label {
  color: rgba(205, 190, 245, 0.82);
}

.hero-sat-value {
  display: block;
  margin-top: 4px;
  color: #f2f8ff;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 12px color-mix(in srgb, var(--sat-tone, var(--accent)) 35%, transparent);
}

.hero-visual {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
}

.hero-bloom {
  position: absolute;
  left: 50%;
  top: 49%;
  width: min(80%, 360px);
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background:
    radial-gradient(circle at 42% 36%, color-mix(in srgb, var(--accent) 40%, transparent), transparent 55%),
    radial-gradient(circle at 58% 62%, color-mix(in srgb, var(--accent-2) 16%, transparent), transparent 50%);
  filter: blur(12px);
  pointer-events: none;
  animation: bloom 7s ease-in-out infinite;
}

.is-exhibit .hero-bloom {
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  border-radius: 0;
}

.hero-floor {
  position: absolute;
  left: 50%;
  bottom: 2%;
  width: min(56%, 260px);
  height: 34px;
  transform: translateX(-50%);
  background: radial-gradient(ellipse at center, color-mix(in srgb, var(--accent) 38%, transparent), transparent 70%);
  filter: blur(1px);
  pointer-events: none;
}

.hero-orbit {
  position: absolute;
  left: 50%;
  top: 49%;
  width: min(82%, 370px);
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  pointer-events: none;

  i {
    position: absolute;
    inset: 0;
    border: 1px dashed color-mix(in srgb, var(--accent) 24%, transparent);
    border-radius: 50%;
    opacity: 0.5;
  }

  i:first-child {
    inset: 7%;
    animation: spin 26s linear infinite;
  }

  i:last-child {
    inset: -3%;
    border-style: solid;
    border-color: transparent;
    border-top-color: color-mix(in srgb, var(--accent) 42%, transparent);
    border-right-color: color-mix(in srgb, var(--accent-2) 22%, transparent);
    animation: spin-rev 14s linear infinite;
  }
}

.is-exhibit .hero-orbit i {
  border-radius: 0;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
}

.hero-svg {
  position: absolute;
  left: 50%;
  top: 49%;
  width: min(90%, 380px);
  height: min(90%, 380px);
  transform: translate(-50%, -50%);
  overflow: visible;
  pointer-events: none;
}

.hero-ticks {
  transform-box: view-box;
  transform-origin: 180px 180px;
  animation: spin-rev 60s linear infinite;
}

.hero-dash {
  transform-box: view-box;
  transform-origin: 180px 180px;
  animation: spin 18s linear infinite;
}

.hero-hex-spin {
  transform-box: view-box;
  transform-origin: 180px 180px;
  animation: spin-rev 34s linear infinite;
}

.hero-hex-core,
.hero-core-fill {
  animation: breathe 3.2s ease-in-out infinite;
}

.hero-progress {
  transition: stroke-dashoffset 0.9s ease;
}

.hero-progress.is-demo {
  opacity: 0.58;
  animation: demo-pulse 2.8s ease-in-out infinite;
}

.eq {
  transform-box: fill-box;
  transform-origin: bottom;
  animation: eq 1s ease-in-out infinite;
}

@for $i from 0 through 11 {
  .eq-#{$i} { animation-delay: #{($i % 6) * 0.08}s; }
}

.hero-glass {
  position: absolute;
  left: 50%;
  top: 49%;
  z-index: 1;
  width: min(34%, 132px);
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background:
    radial-gradient(circle at 40% 32%, rgba(255, 255, 255, 0.1), transparent 55%),
    linear-gradient(160deg, rgba(6, 24, 46, 0.35), rgba(2, 10, 22, 0.18));
  border: 1px solid color-mix(in srgb, var(--accent) 18%, transparent);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 8px 24px rgba(0, 0, 0, 0.18);
  pointer-events: none;
}

.is-exhibit .hero-glass {
  border-radius: 22%;
  clip-path: polygon(50% 4%, 94% 28%, 94% 72%, 50% 96%, 6% 72%, 6% 28%);
  background:
    radial-gradient(circle at 40% 30%, rgba(255, 255, 255, 0.1), transparent 55%),
    linear-gradient(160deg, rgba(36, 20, 72, 0.4), rgba(10, 6, 28, 0.2));
}

.hero-copy {
  position: absolute;
  left: 50%;
  top: 49%;
  z-index: 2;
  width: min(46%, 180px);
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}

.hero-value {
  color: #f7fdff;
  font-size: clamp(46px, 4.8vw, 74px);
  font-weight: 800;
  line-height: 0.92;
  letter-spacing: -0.05em;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 0 20px color-mix(in srgb, var(--accent) 75%, transparent),
    0 0 40px color-mix(in srgb, var(--accent) 28%, transparent),
    0 2px 12px rgba(0, 0, 0, 0.4);
}

.is-exhibit .hero-value {
  color: #faf6ff;
}

.hero-label {
  margin-top: 9px;
  color: color-mix(in srgb, var(--accent) 92%, #fff);
  font-size: clamp(12px, 0.98vw, 15px);
  font-weight: 700;
  letter-spacing: 0.18em;
}

.hero-sub {
  margin-top: 5px;
  color: rgba(175, 205, 230, 0.74);
  font-size: 11px;
}

.is-exhibit .hero-sub {
  color: rgba(205, 190, 245, 0.78);
}

.is-empty .hero-value { opacity: 0.92; }
.is-empty .hero-bloom { animation-duration: 5.5s; }
.is-empty .hero-sub {
  letter-spacing: 0.06em;
  color: color-mix(in srgb, var(--accent) 58%, rgba(180, 210, 230, 0.72));
}

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes spin-rev { to { transform: rotate(-360deg); } }
@keyframes bloom {
  0%, 100% { opacity: 0.78; }
  50% { opacity: 0.95; }
}
@keyframes breathe {
  0%, 100% { opacity: 0.88; }
  50% { opacity: 1; }
}
@keyframes eq {
  0%, 100% { transform: scaleY(0.42); opacity: 0.42; }
  50% { transform: scaleY(1.22); opacity: 1; }
}
@keyframes demo-pulse {
  0%, 100% { opacity: 0.48; }
  50% { opacity: 0.68; }
}
</style>
