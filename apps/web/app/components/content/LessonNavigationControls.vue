<script setup lang="ts">
import type { LessonNavigationItem } from '@ieb/shared'
import UiButton from '../ui/UiButton.vue'

const props = defineProps<{
  previousLesson: LessonNavigationItem | null
  nextLesson: LessonNavigationItem | null
}>()

const previousLessonHref = computed(() => props.previousLesson?.href || null)
const nextLessonHref = computed(() => props.nextLesson?.href || null)
const isPreviousButtonDisabled = computed(() => !previousLessonHref.value)
const isNextButtonDisabled = computed(() => !nextLessonHref.value)
</script>

<template>
  <div class="lesson-navigation">
    <UiButton
      :to="previousLessonHref || undefined"
      :disabled="isPreviousButtonDisabled"
      variant="secondary"
      size="lg"
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
    </UiButton>

    <UiButton
      :to="nextLessonHref || undefined"
      :disabled="isNextButtonDisabled"
      size="lg"
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
    </UiButton>
  </div>
</template>

<style scoped>
.lesson-navigation {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
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
