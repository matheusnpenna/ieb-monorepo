<script setup lang="ts">
import type { LessonNavigationItem } from '@ieb/shared'

const props = defineProps<{
  previousLesson: LessonNavigationItem | null
  nextLesson: LessonNavigationItem | null
}>()

const previousLessonHref = computed(() => props.previousLesson?.href || null)
const nextLessonHref = computed(() => props.nextLesson?.href || null)
const isPreviousLinkDisabled = computed(() => !previousLessonHref.value)
const isNextLinkDisabled = computed(() => !nextLessonHref.value)
const previousLinkClass = computed(() => [
  'lesson-link',
  'lesson-link-secondary',
  isPreviousLinkDisabled.value ? 'lesson-link-disabled' : ''
])
const nextLinkClass = computed(() => [
  'lesson-link',
  'lesson-link-primary',
  isNextLinkDisabled.value ? 'lesson-link-disabled' : ''
])
</script>

<template>
  <div class="lesson-navigation">
    <span
      v-if="isPreviousLinkDisabled"
      :class="previousLinkClass"
      aria-disabled="true"
    >
      <svg class="button-icon" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M9.5 3.5L5 8l4.5 4.5"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.6"
        />
      </svg>
      Anterior
    </span>
    <NuxtLink
      v-else
      :to="previousLessonHref || undefined"
      :class="previousLinkClass"
    >
      <svg class="button-icon" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M9.5 3.5L5 8l4.5 4.5"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.6"
        />
      </svg>
      Anterior
    </NuxtLink>

    <span
      v-if="isNextLinkDisabled"
      :class="nextLinkClass"
      aria-disabled="true"
    >
      Proximo
      <svg class="button-icon" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M6.5 3.5L11 8l-4.5 4.5"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.6"
        />
      </svg>
    </span>
    <NuxtLink
      v-else
      :to="nextLessonHref || undefined"
      :class="nextLinkClass"
    >
      Proximo
      <svg class="button-icon" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M6.5 3.5L11 8l-4.5 4.5"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.6"
        />
      </svg>
    </NuxtLink>
  </div>
</template>

<style scoped>
.lesson-navigation {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
}

.lesson-link {
  display: inline-flex;
  min-height: 3.5rem;
  width: auto;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 9999px;
  border: 1px solid transparent;
  padding: 0 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  text-decoration: none;
  transition:
    transform 200ms ease-out,
    filter 200ms ease-out,
    background-color 200ms ease-out,
    border-color 200ms ease-out,
    opacity 200ms ease-out;
}

.lesson-link:focus-visible {
  outline: none;
}

.lesson-link-primary {
  border-color: var(--ds-accent);
  background: linear-gradient(180deg, #ff2d2d 0%, #b20710 100%);
  color: white;
  box-shadow: 0 14px 30px rgba(229, 9, 20, 0.28);
}

.lesson-link-secondary {
  border-color: rgb(255 255 255 / 0.16);
  background: rgb(255 255 255 / 0.06);
  color: var(--ds-text);
}

.lesson-link:not(.lesson-link-disabled):hover {
  transform: translateY(-2px);
}

.lesson-link-primary:not(.lesson-link-disabled):hover {
  filter: brightness(1.1);
}

.lesson-link-secondary:not(.lesson-link-disabled):hover {
  background: rgb(255 255 255 / 0.1);
}

.lesson-link-disabled {
  cursor: not-allowed;
  opacity: 0.6;
  pointer-events: none;
}

.button-icon {
  width: 1rem;
  height: 1rem;
  flex: none;
}

@media (max-width: 720px) {
  .lesson-navigation {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
