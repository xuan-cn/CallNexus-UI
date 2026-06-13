<template>
  <div class="audio-waveform">
    <button class="play-button" type="button" :disabled="loading || failed" :aria-label="playing ? '暂停' : '播放'" @click="togglePlayback">
      {{ playing ? '❚❚' : '▶' }}
    </button>
    <div class="waveform-content">
      <div ref="waveformRef" class="waveform-container"></div>
      <span v-if="loading" class="waveform-message">正在加载录音波形...</span>
      <span v-else-if="failed" class="waveform-message error">录音波形加载失败</span>
    </div>
    <span class="time-label">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
  </div>
</template>

<script setup lang="ts">
import WaveSurfer from 'wavesurfer.js';

const props = defineProps<{
  src: string;
}>();

const waveformRef = ref<HTMLDivElement>();
const duration = ref(0);
const currentTime = ref(0);
const playing = ref(false);
const loading = ref(true);
const failed = ref(false);
let waveSurfer: WaveSurfer | undefined;

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(remainSeconds).padStart(2, '0')}`;
};

const destroyWaveSurfer = () => {
  waveSurfer?.destroy();
  waveSurfer = undefined;
};

const createWaveSurfer = () => {
  if (!waveformRef.value || !props.src) return;
  destroyWaveSurfer();
  loading.value = true;
  failed.value = false;
  playing.value = false;
  currentTime.value = 0;
  duration.value = 0;

  waveSurfer = WaveSurfer.create({
    container: waveformRef.value,
    url: props.src,
    height: 76,
    waveColor: '#cbd5e1',
    progressColor: '#053b70',
    cursorColor: '#053b70',
    cursorWidth: 2,
    barWidth: 3,
    barGap: 2,
    barRadius: 3,
    normalize: true,
    dragToSeek: true
  });

  waveSurfer.on('ready', (value) => {
    duration.value = value;
    loading.value = false;
  });
  waveSurfer.on('timeupdate', (value) => {
    currentTime.value = value;
  });
  waveSurfer.on('play', () => {
    playing.value = true;
  });
  waveSurfer.on('pause', () => {
    playing.value = false;
  });
  waveSurfer.on('finish', () => {
    playing.value = false;
  });
  waveSurfer.on('error', () => {
    loading.value = false;
    failed.value = true;
    playing.value = false;
  });
};

const togglePlayback = () => {
  waveSurfer?.playPause();
};

watch(
  () => props.src,
  () => nextTick(createWaveSurfer)
);

onMounted(createWaveSurfer);
onBeforeUnmount(destroyWaveSurfer);
</script>

<style scoped>
.audio-waveform {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 112px;
  gap: 14px;
  align-items: center;
  padding: 18px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
}
.play-button {
  width: 42px;
  height: 42px;
  color: #fff;
  cursor: pointer;
  border: 0;
  border-radius: 50%;
  background: #053b70;
  box-shadow: 0 6px 16px rgb(5 59 112 / 24%);
}
.play-button:disabled {
  cursor: not-allowed;
  background: #94a3b8;
  box-shadow: none;
}
.waveform-content {
  position: relative;
  min-width: 0;
}
.waveform-container {
  min-height: 76px;
}
.waveform-message {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 13px;
  pointer-events: none;
}
.waveform-message.error {
  color: #f56c6c;
}
.time-label {
  color: #475569;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
@media (width <= 768px) {
  .audio-waveform {
    grid-template-columns: 42px minmax(0, 1fr);
  }
  .time-label {
    grid-column: 2;
    text-align: left;
  }
}
</style>
