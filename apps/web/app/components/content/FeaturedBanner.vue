<script setup lang="ts">
import type { ButtonVariant, HighlightActionTarget, HighlightMediaType } from '@ieb/shared'
import UiButton from '../ui/UiButton.vue'
import UiPanel from '../ui/UiPanel.vue'

interface FeaturedBannerAction {
  id: string
  label: string
  href: string
  target: HighlightActionTarget
  variant: ButtonVariant
}

const props = withDefaults(
  defineProps<{
    title: string
    description: string
    badge?: string | null
    mediaType?: HighlightMediaType | null
    mediaUrl?: string | null
    actions?: FeaturedBannerAction[]
  }>(),
  {
    badge: null,
    mediaType: null,
    mediaUrl: null,
    actions: () => []
  }
)

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

const normalizedMedia = computed(() => {
  if (!props.mediaType || !props.mediaUrl?.trim()) {
    return null
  }

  if (props.mediaType === 'image') {
    return {
      kind: 'image' as const,
      url: props.mediaUrl.trim()
    }
  }

  const youtubeId = extractYouTubeId(props.mediaUrl)

  if (youtubeId) {
    return {
      kind: 'youtube' as const,
      url: `https://www.youtube.com/embed/${youtubeId}`
    }
  }

  const vimeoId = extractVimeoId(props.mediaUrl)

  if (vimeoId) {
    return {
      kind: 'vimeo' as const,
      url: `https://player.vimeo.com/video/${vimeoId}`
    }
  }

  return {
    kind: 'video' as const,
    url: props.mediaUrl.trim()
  }
})

const normalizedActions = computed(() =>
  props.actions.map((action) => {
    const isExternal =
      action.target === '_blank' || /^(https?:\/\/|mailto:|tel:)/i.test(action.href)

    return {
      ...action,
      to: isExternal ? undefined : action.href,
      href: isExternal ? action.href : undefined
    }
  })
)
</script>

<template>
  <UiPanel tone="hero" padding="lg" class="featured-banner">
    <div class="featured-banner__layout" :class="{ 'featured-banner__layout--with-media': normalizedMedia }">
      <div class="section-stack featured-banner__copy">
        <span v-if="badge" class="pill w-fit">{{ badge }}</span>
        <h1 class="display-title featured-banner__title">{{ title }}</h1>
        <p class="body-copy featured-banner__description">{{ description }}</p>
        <div v-if="normalizedActions.length > 0" class="button-row featured-banner__actions">
          <UiButton
            v-for="action in normalizedActions"
            :key="action.id"
            :to="action.to"
            :href="action.href"
            :target="action.target"
            :variant="action.variant"
            size="lg"
          >
            {{ action.label }}
          </UiButton>
        </div>
      </div>

      <div v-if="normalizedMedia" class="featured-banner__media">
        <img
          v-if="normalizedMedia.kind === 'image'"
          :src="normalizedMedia.url"
          :alt="title"
          class="featured-banner__image"
        >
        <video
          v-else-if="normalizedMedia.kind === 'video'"
          :src="normalizedMedia.url"
          class="featured-banner__video"
          autoplay
          muted
          loop
          playsinline
        />
        <iframe
          v-else
          :src="normalizedMedia.url"
          :title="title"
          class="featured-banner__embed"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        />
      </div>
    </div>
  </UiPanel>
</template>

<style scoped>
.featured-banner__layout {
  display: grid;
  gap: 1.5rem;
}

.featured-banner__layout--with-media {
  grid-template-columns: minmax(0, 1.3fr) minmax(280px, 0.9fr);
  align-items: center;
}

.featured-banner__copy {
  min-width: 0;
}

.featured-banner__title {
  max-width: 16ch;
}

.featured-banner__description {
  color: rgba(245, 245, 241, 0.78);
  max-width: 62ch;
}

.featured-banner__media {
  position: relative;
  overflow: hidden;
  min-height: 260px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 26px;
  background:
    radial-gradient(circle at top, rgba(229, 9, 20, 0.18), transparent 56%),
    rgba(8, 8, 10, 0.88);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.featured-banner__image,
.featured-banner__video,
.featured-banner__embed {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  object-fit: cover;
  position: absolute;
}

@media (max-width: 960px) {
  .featured-banner__layout--with-media {
    grid-template-columns: 1fr;
  }

  .featured-banner__title {
    max-width: none;
  }
}
</style>
