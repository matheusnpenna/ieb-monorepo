<script setup lang="ts">
import type { Course } from '@ieb/shared'
import SurfaceCard from '../base/SurfaceCard.vue'
import videiraLogoUrl from '../../assets/img/logos/videira-logo.svg'

export type CourseGridItem = Pick<Course, 'id' | 'title' | 'slug' | 'coverImageUrl' | 'shortDescription'> & {
  meta: string
}

defineProps<{
  items: CourseGridItem[]
}>()
</script>

<template>
  <section class="course-grid" aria-label="Lista de cursos">
    <NuxtLink v-for="course in items" :key="course.id" :to="`/curso/${course.slug}`" class="course-link">
      <SurfaceCard as="article" class="course-card">
        <div class="course-cover">
          <img
            :src="course.coverImageUrl || videiraLogoUrl"
            :alt="`Capa do curso ${course.title}`"
            class="course-cover-media"
            :class="{ fallback: !course.coverImageUrl }"
            loading="lazy"
            decoding="async"
          />
        </div>

        <div class="course-copy">
          <span class="pill w-fit">{{ course.meta }}</span>
          <h2 class="course-title">{{ course.title }}</h2>
          <p class="body-copy">{{ course.shortDescription }}</p>
        </div>
      </SurfaceCard>
    </NuxtLink>
  </section>
</template>

<style scoped>
.course-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1rem;
}

.course-link {
  display: block;
  color: inherit;
  text-decoration: none;
}

.course-link:focus-visible {
  outline: none;
}

.course-card {
  height: 100%;
  overflow: hidden;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.course-link:hover .course-card,
.course-link:focus-visible .course-card {
  transform: translateY(-2px);
  box-shadow: 0 28px 70px rgba(0, 0, 0, 0.52);
}

.course-cover {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1.5rem;
  background:
    radial-gradient(circle at top, rgba(229, 9, 20, 0.18), transparent 60%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.01)),
    rgba(9, 9, 9, 0.9);
  aspect-ratio: 16 / 9;
}

.course-cover::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 38%, rgba(0, 0, 0, 0.24) 100%);
  pointer-events: none;
}

.course-cover-media {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 260ms ease;
  &.fallback {
    object-fit: contain;
    margin: auto auto;
    width: 50%;
    height: 100%;
    filter: grayscale(100%) brightness(120%);
  }
}

.course-link:hover .course-cover-media,
.course-link:focus-visible .course-cover-media {
  transform: scale(1.08);
}

.course-copy {
  display: grid;
  gap: 0.9rem;
  padding-top: 1rem;
}

.course-title {
  font-family: 'Fraunces', serif;
  font-size: clamp(1.35rem, 2vw, 1.6rem);
  line-height: 1.02;
  letter-spacing: -0.04em;
  color: var(--ds-text);
}

.course-meta {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
}

.course-meta-row {
  display: grid;
  gap: 0.3rem;
}

.course-meta-row dt {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ds-accent-strong);
}

.course-meta-row dd {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: rgba(245, 245, 241, 0.92);
  word-break: break-word;
}

@media (min-width: 700px) {
  .course-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1080px) {
  .course-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
