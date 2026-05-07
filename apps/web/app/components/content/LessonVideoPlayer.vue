<script setup lang="ts">
import Hls from 'hls.js'
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

interface VideoPlayerProgressPayload {
  currentTimeInSeconds: number
  durationInSeconds: number
  completionRate: number
  ended: boolean
}

type SupportedProvider = 'empty' | 'hls' | 'native' | 'youtube' | 'vimeo'

interface SourceConfig {
  kind: SupportedProvider
  url: string | null
  embedId: string | null
}

const props = withDefaults(
  defineProps<{
    src: string | null
    poster?: string | null
    title: string
    startAtSeconds?: number
  }>(),
  {
    poster: null,
    startAtSeconds: 0
  }
)

const emit = defineEmits<{
  progress: [payload: VideoPlayerProgressPayload]
}>()

const videoElement = ref<HTMLVideoElement | null>(null)
const embedElement = ref<HTMLDivElement | null>(null)
const hlsInstance = ref<Hls | null>(null)
const plyrInstance = ref<Plyr | null>(null)
const hasAppliedInitialPosition = ref(false)
const lastReportedAt = ref(0)

const isHlsSource = (value: string) => /\.m3u8($|\?)/i.test(value)

const extractYouTubeId = (value: string) => {
  const normalizedValue = value.trim()
  const match = normalizedValue.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/|u\/\w\/))([^#&?/\s]{11})/i
  )

  return match?.[1] || null
}

const extractVimeoId = (value: string) => {
  const normalizedValue = value.trim()
  const match = normalizedValue.match(/vimeo\.com\/(?:video\/)?(\d+)/i)

  return match?.[1] || null
}

const normalizeSource = (value: string | null): SourceConfig => {
  if (!value?.trim()) {
    return {
      kind: 'empty',
      url: null,
      embedId: null
    }
  }

  if (isHlsSource(value)) {
    return {
      kind: 'hls',
      url: value,
      embedId: null
    }
  }

  const youtubeId = extractYouTubeId(value)

  if (youtubeId) {
    return {
      kind: 'youtube',
      url: `https://www.youtube.com/embed/${youtubeId}`,
      embedId: youtubeId
    }
  }

  const vimeoId = extractVimeoId(value)

  if (vimeoId) {
    return {
      kind: 'vimeo',
      url: `https://player.vimeo.com/video/${vimeoId}`,
      embedId: vimeoId
    }
  }

  return {
    kind: 'native',
    url: value,
    embedId: null
  }
}

const sourceConfig = computed(() => normalizeSource(props.src))
const usesEmbeddedProvider = computed(
  () => sourceConfig.value.kind === 'youtube' || sourceConfig.value.kind === 'vimeo'
)
const usesVideoElement = computed(
  () => sourceConfig.value.kind === 'hls' || sourceConfig.value.kind === 'native'
)

const buildPlyrOptions = (): Plyr.Options => ({
  autoplay: false,
  invertTime: false,
  controls: [
    'play-large',
    'rewind',
    'play',
    'fast-forward',
    'progress',
    'current-time',
    'mute',
    'volume',
    'settings',
    'pip',
    'airplay',
    'fullscreen'
  ],
  speed: {
    selected: Number(window.sessionStorage.getItem('lesson-player-speed') || 1),
    options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
  },
  youtube: {
    rel: 0,
    modestbranding: 1,
    noCookie: true
  },
  vimeo: {
    playsinline: true
  }
})

const destroyPlayer = () => {
  if (plyrInstance.value) {
    plyrInstance.value.destroy()
    plyrInstance.value = null
  }

  if (hlsInstance.value) {
    hlsInstance.value.destroy()
    hlsInstance.value = null
  }
}

const applyInitialPosition = () => {
  const player = plyrInstance.value

  if (!player || hasAppliedInitialPosition.value || !props.startAtSeconds || props.startAtSeconds <= 0) {
    return
  }

  const duration = Number(player.duration || 0)
  const safePosition = duration > 0
    ? Math.min(props.startAtSeconds, Math.max(duration - 1, 0))
    : props.startAtSeconds

  try {
    player.currentTime = safePosition
    hasAppliedInitialPosition.value = true
  } catch {
    // Providers like YouTube/Vimeo may reject seeks before full readiness.
  }
}

const emitProgress = (ended = false, force = false) => {
  const player = plyrInstance.value

  if (!player || !Number.isFinite(player.duration) || player.duration <= 0) {
    return
  }

  const now = Date.now()

  if (!force && !ended && now - lastReportedAt.value < 5000) {
    return
  }

  lastReportedAt.value = now

  emit('progress', {
    currentTimeInSeconds: Math.floor(player.currentTime || 0),
    durationInSeconds: Math.floor(player.duration || 0),
    completionRate: Math.min(100, Math.round(((player.currentTime || 0) / player.duration) * 100)),
    ended
  })
}

const bindPlayerEvents = (player: Plyr) => {
  player.on('ready', () => {
    applyInitialPosition()
  })

  player.on('play', () => {
    applyInitialPosition()
  })

  player.on('pause', () => {
    emitProgress(false, true)
  })

  player.on('timeupdate', () => {
    emitProgress(false, false)
  })

  player.on('ended', () => {
    emitProgress(true, true)
  })

  player.on('ratechange', () => {
    window.sessionStorage.setItem('lesson-player-speed', String(player.speed))
  })
}

const initializeVideoElementPlayer = () => {
  const video = videoElement.value

  if (!video || !sourceConfig.value.url) {
    return
  }

  video.removeAttribute('src')
  video.load()

  if (sourceConfig.value.kind === 'hls') {
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = sourceConfig.value.url
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true
      })

      hls.loadSource(sourceConfig.value.url)
      hls.attachMedia(video)
      hlsInstance.value = hls
    } else {
      video.src = sourceConfig.value.url
    }
  } else {
    video.src = sourceConfig.value.url
  }

  const player = new Plyr(video, buildPlyrOptions())
  plyrInstance.value = player
  bindPlayerEvents(player)
}

const initializeEmbeddedPlayer = () => {
  const embed = embedElement.value

  if (!embed || !sourceConfig.value.embedId || !usesEmbeddedProvider.value) {
    return
  }

  embed.dataset.plyrProvider = sourceConfig.value.kind
  embed.dataset.plyrEmbedId = sourceConfig.value.embedId

  const player = new Plyr(embed, buildPlyrOptions())
  plyrInstance.value = player
  bindPlayerEvents(player)
}

const initializePlayer = async () => {
  destroyPlayer()
  hasAppliedInitialPosition.value = false
  lastReportedAt.value = 0

  await nextTick()

  if (sourceConfig.value.kind === 'empty') {
    return
  }

  if (usesEmbeddedProvider.value) {
    initializeEmbeddedPlayer()
    return
  }

  initializeVideoElementPlayer()
}

onMounted(() => {
  void initializePlayer()
})

onBeforeUnmount(() => {
  emitProgress(false, true)
  destroyPlayer()
})

watch(
  () => props.src,
  () => {
    void initializePlayer()
  }
)
</script>

<template>
  <div class="video-player-shell">
    <video
      v-if="usesVideoElement"
      ref="videoElement"
      class="video-player-element"
      :poster="poster || undefined"
      :aria-label="title"
      controls
      playsinline
      crossorigin="anonymous"
      preload="metadata"
    />

    <div
      v-else-if="usesEmbeddedProvider"
      ref="embedElement"
      class="video-player-element video-player-embed"
      :aria-label="title"
    />

    <div v-else class="video-player-empty">
      Nenhum video foi disponibilizado para esta aula no momento.
    </div>
  </div>
</template>

<style scoped>
.video-player-shell {
  display: grid;
  gap: 1rem;
}

.video-player-element {
  width: 100%;
  min-height: 320px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  background:
    radial-gradient(circle at top, rgba(229, 9, 20, 0.18), transparent 40%),
    rgba(11, 11, 11, 0.92);
  overflow: hidden;
}

.video-player-embed {
  aspect-ratio: 16 / 9;
  min-height: min(56.25vw, 320px);
}

.video-player-empty {
  min-height: 320px;
  display: grid;
  place-items: center;
  border: 1px dashed rgba(71, 55, 36, 0.26);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-muted);
  text-align: center;
  padding: 2rem;
}

:deep(.plyr) {
  border-radius: 20px;
  overflow: hidden;
  min-height: 320px;
  background:
    radial-gradient(circle at top, rgba(229, 9, 20, 0.18), transparent 40%),
    rgba(11, 11, 11, 0.92);
}

:deep(.plyr__video-wrapper),
:deep(.plyr__video-embed) {
  background: rgba(11, 11, 11, 0.92);
}

:deep(.plyr--video) {
  --plyr-color-main: #e50914;
  --plyr-video-control-color: #f5f5f1;
  --plyr-video-controls-background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.76) 100%);
  --plyr-menu-background: rgba(17, 17, 17, 0.96);
  --plyr-menu-color: #f5f5f1;
  --plyr-control-radius: 999px;
}
</style>
