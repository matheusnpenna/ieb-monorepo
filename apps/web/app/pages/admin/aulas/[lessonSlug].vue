<script setup lang="ts">
import AdminLessonEditorView from '../../../components/admin/AdminLessonEditorView.vue'

definePageMeta({
  layout: 'admin'
})

const route = useRoute()
const lessonSlug = computed(() => String(route.params.lessonSlug ?? ''))

useSeoMeta({
  title: computed(() => `Editar aula ${lessonSlug.value}`.trim())
})
</script>

<template>
  <AdminLessonEditorView mode="edit" :lesson-slug="lessonSlug" />
</template>
