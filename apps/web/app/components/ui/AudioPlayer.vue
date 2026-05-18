<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import UiButton from './UiButton.vue'
import UiPanel from './UiPanel.vue'
import UiSpinner from './UiSpinner.vue'

type PlaybackRate = 0.5 | 1 | 1.5 | 2

type WaveSurferInstance = {
  destroy: () => void
  load: (url: string) => Promise<void> | void
  on?: (event: string, callback: (...args: unknown[]) => void) => (() => void) | void
}

export interface AudioPlayerProgress {
  currentTimeInSeconds: number
  durationInSeconds: number
  percentage: number
}

const props = withDefaults(
  defineProps<{
    src: string
    title?: string
    initialPositionInSeconds?: number
    progressDebounceMs?: number
  }>(),
  {
    title: 'Audio da aula',
    initialPositionInSeconds: 0,
    progressDebounceMs: 1000
  }
)

const emit = defineEmits<{
  loaded: [payload: { durationInSeconds: number }]
  error: [payload: { message: string }]
  play: []
  pause: []
  ended: [payload: AudioPlayerProgress]
  seek: [payload: AudioPlayerProgress]
  progress: [payload: AudioPlayerProgress]
  'rate-change': [rate: PlaybackRate]
  'volume-change': [volume: number]
}>()

const playbackRates = [0.5, 1, 1.5, 2] as const
const audioRef = ref<HTMLAudioElement | null>(null)
const waveformRef = ref<HTMLDivElement | null>(null)
const waveSurfer = ref<WaveSurferInstance | null>(null)
const loading = ref(false)
const waveformLoading = ref(false)
const waveformUnavailable = ref(false)
const errorMessage = ref('')
const isPlaying = ref(false)
const currentTimeInSeconds = ref(0)
const durationInSeconds = ref(0)
const volume = ref(1)
const playbackRate = ref<PlaybackRate>(1)
let progressTimeout: ReturnType<typeof setTimeout> | null = null
let waveformToken = 0
let initialPositionApplied = false

const hasDuration = computed(() => Number.isFinite(durationInSeconds.value) && durationInSeconds.value > 0)
const progressPercentage = computed(() => {
  if (!hasDuration.value) {
    return 0
  }

  return Math.min(100, Math.max(0, (currentTimeInSeconds.value / durationInSeconds.value) * 100))
})
const currentTimeLabel = computed(() => formatTime(currentTimeInSeconds.value))
const durationLabel = computed(() => formatTime(durationInSeconds.value))
const playPauseLabel = computed(() => (isPlaying.value ? 'Pausar audio' : 'Reproduzir audio'))

const formatTime = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return '0:00'
  }

  const totalSeconds = Math.floor(value)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const clampTime = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(Math.max(0, value), durationInSeconds.value || Number.MAX_SAFE_INTEGER)
}

const buildProgress = (): AudioPlayerProgress => ({
  currentTimeInSeconds: Math.round(currentTimeInSeconds.value),
  durationInSeconds: Math.round(durationInSeconds.value),
  percentage: Math.round(progressPercentage.value)
})

const clearProgressTimeout = () => {
  if (!progressTimeout) {
    return
  }

  clearTimeout(progressTimeout)
  progressTimeout = null
}

const emitProgress = () => {
  if (!hasDuration.value) {
    return
  }

  clearProgressTimeout()
  progressTimeout = setTimeout(() => {
    emit('progress', buildProgress())
  }, props.progressDebounceMs)
}

const destroyWaveform = () => {
  waveformToken += 1

  if (!waveSurfer.value) {
    return
  }

  waveSurfer.value.destroy()
  waveSurfer.value = null
}

const setupWaveform = async () => {
  const container = waveformRef.value
  const src = props.src

  destroyWaveform()
  const token = (waveformToken += 1)
  waveformUnavailable.value = false

  if (!container || !src || typeof window === 'undefined') {
    return
  }

  waveformLoading.value = true

  try {
    const { default: WaveSurfer } = await import('wavesurfer.js')

    if (token !== waveformToken) {
      return
    }

    const instance = WaveSurfer.create({
      container,
      height: 92,
      waveColor: 'rgba(245, 245, 241, 0.26)',
      progressColor: 'rgba(229, 9, 20, 0.78)',
      cursorColor: 'transparent',
      barWidth: 3,
      barGap: 3,
      barRadius: 4,
      normalize: true,
      interact: false
    }) as WaveSurferInstance

    waveSurfer.value = instance
    instance.on?.('ready', () => {
      if (token === waveformToken) {
        waveformLoading.value = false
      }
    })
    instance.on?.('error', () => {
      if (token === waveformToken) {
        waveformLoading.value = false
        waveformUnavailable.value = true
      }
    })
    await instance.load(src)

    if (token === waveformToken) {
      waveformLoading.value = false
    }
  } catch {
    if (token === waveformToken) {
      waveformLoading.value = false
      waveformUnavailable.value = true
    }
  }
}

const syncAudioSettings = () => {
  if (!audioRef.value) {
    return
  }

  audioRef.value.volume = volume.value
  audioRef.value.playbackRate = playbackRate.value
}

const applyInitialPosition = () => {
  if (!audioRef.value || initialPositionApplied || !hasDuration.value) {
    return
  }

  const nextPosition = clampTime(props.initialPositionInSeconds)
  audioRef.value.currentTime = nextPosition
  currentTimeInSeconds.value = nextPosition
  initialPositionApplied = true
}

const onLoadedMetadata = () => {
  if (!audioRef.value) {
    return
  }

  durationInSeconds.value = audioRef.value.duration || 0
  syncAudioSettings()
  applyInitialPosition()
  loading.value = false
  errorMessage.value = ''
  emit('loaded', { durationInSeconds: Math.round(durationInSeconds.value) })
  emitProgress()
}

const onTimeUpdate = () => {
  if (!audioRef.value) {
    return
  }

  currentTimeInSeconds.value = audioRef.value.currentTime || 0
  emitProgress()
}

const onWaiting = () => {
  loading.value = true
}

const onPlaying = () => {
  loading.value = false
  isPlaying.value = true
  emit('play')
}

const onPause = () => {
  isPlaying.value = false
  emit('pause')
  emitProgress()
}

const onEnded = () => {
  isPlaying.value = false
  currentTimeInSeconds.value = durationInSeconds.value
  const progress = buildProgress()
  emit('ended', progress)
  emit('progress', progress)
}

const onAudioError = () => {
  loading.value = false
  isPlaying.value = false
  errorMessage.value = 'Nao foi possivel carregar o audio.'
  emit('error', { message: errorMessage.value })
}

const togglePlayback = async () => {
  if (!audioRef.value || !props.src) {
    return
  }

  if (isPlaying.value) {
    audioRef.value.pause()
    return
  }

  try {
    await audioRef.value.play()
  } catch {
    errorMessage.value = 'Nao foi possivel reproduzir o audio.'
    emit('error', { message: errorMessage.value })
  }
}

const seekTo = (value: number) => {
  if (!audioRef.value || !hasDuration.value) {
    return
  }

  const nextTime = clampTime(value)
  audioRef.value.currentTime = nextTime
  currentTimeInSeconds.value = nextTime
  const progress = buildProgress()
  emit('seek', progress)
  emitProgress()
}

const skipBy = (seconds: number) => {
  seekTo(currentTimeInSeconds.value + seconds)
}

const setPlaybackRate = (rate: PlaybackRate) => {
  playbackRate.value = rate

  if (audioRef.value) {
    audioRef.value.playbackRate = rate
  }

  emit('rate-change', rate)
}

const setVolume = (value: number) => {
  const nextVolume = Math.min(Math.max(Number(value) || 0, 0), 1)
  volume.value = nextVolume

  if (audioRef.value) {
    audioRef.value.volume = nextVolume
  }

  emit('volume-change', nextVolume)
}

watch(
  () => props.src,
  async () => {
    loading.value = Boolean(props.src)
    errorMessage.value = ''
    isPlaying.value = false
    currentTimeInSeconds.value = 0
    durationInSeconds.value = 0
    playbackRate.value = 1
    initialPositionApplied = false
    clearProgressTimeout()
    await nextTick()
    syncAudioSettings()
    await setupWaveform()
  },
  { immediate: true }
)

watch(
  () => props.initialPositionInSeconds,
  (nextPosition) => {
    if (!audioRef.value || !hasDuration.value) {
      return
    }

    seekTo(nextPosition)
  }
)

onBeforeUnmount(() => {
  clearProgressTimeout()
  destroyWaveform()
})
</script>

<template>
  <UiPanel as="section" tone="strong" padding="md" class="audio-player">
    <div class="audio-player__header">
      <div class="audio-player__copy">
        <span class="audio-player__eyebrow">Audio</span>
        <h3 class="audio-player__title">{{ title }}</h3>
      </div>
      <span class="audio-player__time">{{ currentTimeLabel }} / {{ durationLabel }}</span>
    </div>

    <div class="audio-player__waveform-shell">
      <div ref="waveformRef" class="audio-player__waveform" aria-hidden="true" />
      <div v-if="waveformLoading" class="audio-player__waveform-state">
        <UiSpinner size="sm" label="Carregando visualizacao do audio" />
      </div>
      <p v-else-if="waveformUnavailable" class="audio-player__waveform-state-text">
        Visualizacao indisponivel
      </p>
    </div>

    <audio
      ref="audioRef"
      :src="src"
      preload="metadata"
      class="audio-player__native"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
      @waiting="onWaiting"
      @playing="onPlaying"
      @pause="onPause"
      @ended="onEnded"
      @error="onAudioError"
    />

    <p v-if="errorMessage" class="audio-player__error">{{ errorMessage }}</p>

    <div class="audio-player__timeline">
      <input
        class="audio-player__range audio-player__range--progress"
        type="range"
        min="0"
        :max="Math.max(durationInSeconds, 0)"
        step="1"
        :value="currentTimeInSeconds"
        :disabled="!hasDuration"
        :aria-label="`Progresso do audio: ${currentTimeLabel} de ${durationLabel}`"
        @input="seekTo(Number(($event.target as HTMLInputElement).value))"
      >
    </div>

    <div class="audio-player__controls">
      <div class="audio-player__transport">
        <UiButton
          type="button"
          variant="secondary"
          size="sm"
          :disabled="!hasDuration"
          aria-label="Voltar 10 segundos"
          @click="skipBy(-10)"
        >
          -10s
        </UiButton>

        <UiButton
          type="button"
          variant="primary"
          size="sm"
          :loading="loading"
          :disabled="!src || Boolean(errorMessage)"
          :aria-label="playPauseLabel"
          @click="togglePlayback"
        >
          {{ isPlaying ? 'Pausar' : 'Play' }}
        </UiButton>

        <UiButton
          type="button"
          variant="secondary"
          size="sm"
          :disabled="!hasDuration"
          aria-label="Avancar 10 segundos"
          @click="skipBy(10)"
        >
          +10s
        </UiButton>
      </div>

      <div class="audio-player__speed" aria-label="Velocidade do audio">
        <button
          v-for="rate in playbackRates"
          :key="rate"
          class="audio-player__speed-button"
          :data-active="playbackRate === rate"
          type="button"
          @click="setPlaybackRate(rate)"
        >
          {{ rate }}x
        </button>
      </div>

      <label class="audio-player__volume">
        <span>Volume</span>
        <input
          class="audio-player__range"
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="volume"
          aria-label="Volume do audio"
          @input="setVolume(Number(($event.target as HTMLInputElement).value))"
        >
      </label>
    </div>
  </UiPanel>
</template>

<style scoped>
.audio-player {
  display: grid;
  gap: 1rem;
}

.audio-player__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.audio-player__copy {
  display: grid;
  gap: 0.25rem;
}

.audio-player__eyebrow {
  color: var(--ds-accent);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.audio-player__title {
  margin: 0;
  color: var(--ds-text);
  font-family: Manrope, sans-serif;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0;
}

.audio-player__time {
  flex: none;
  color: var(--ds-muted);
  font-size: 0.88rem;
  font-variant-numeric: tabular-nums;
}

.audio-player__waveform-shell {
  position: relative;
  min-height: 116px;
  overflow: hidden;
  border: 1px solid var(--ds-border);
  border-radius: 18px;
  background:
    radial-gradient(circle at 12% 0%, rgba(229, 9, 20, 0.2), transparent 32%),
    linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
}

.audio-player__waveform {
  min-height: 116px;
  padding: 0.75rem 1rem;
}

.audio-player__waveform-state,
.audio-player__waveform-state-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(9, 9, 9, 0.5);
  color: var(--ds-muted);
  font-size: 0.85rem;
}

.audio-player__native {
  display: none;
}

.audio-player__error {
  margin: 0;
  color: var(--ds-danger);
  font-size: 0.9rem;
}

.audio-player__timeline {
  display: grid;
  gap: 0.5rem;
}

.audio-player__controls {
  display: grid;
  grid-template-columns: auto minmax(180px, 1fr) minmax(180px, 0.8fr);
  gap: 1rem;
  align-items: center;
}

.audio-player__transport,
.audio-player__speed {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.audio-player__speed {
  justify-content: center;
}

.audio-player__speed-button {
  min-width: 3.25rem;
  min-height: 2.5rem;
  border: 1px solid var(--ds-border);
  border-radius: 999px;
  background: rgba(255,255,255,0.06);
  color: var(--ds-muted);
  cursor: pointer;
  font-weight: 800;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.audio-player__speed-button:hover,
.audio-player__speed-button[data-active='true'] {
  border-color: rgba(229, 9, 20, 0.72);
  background: rgba(229, 9, 20, 0.18);
  color: var(--ds-text);
  transform: translateY(-1px);
}

.audio-player__volume {
  display: grid;
  grid-template-columns: auto minmax(120px, 1fr);
  gap: 0.75rem;
  align-items: center;
  color: var(--ds-muted);
  font-size: 0.85rem;
  font-weight: 800;
}

.audio-player__range {
  width: 100%;
  accent-color: var(--ds-accent);
  cursor: pointer;
}

.audio-player__range:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.audio-player__range--progress {
  min-height: 1.75rem;
}

@media (max-width: 860px) {
  .audio-player__header,
  .audio-player__controls {
    grid-template-columns: 1fr;
  }

  .audio-player__header {
    display: grid;
  }

  .audio-player__speed {
    justify-content: flex-start;
  }
}
</style>
