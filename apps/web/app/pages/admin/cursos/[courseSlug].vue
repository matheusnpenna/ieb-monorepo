<script setup lang="ts">
import AdminCourseEditorView from '../../../components/admin/AdminCourseEditorView.vue'

definePageMeta({
  layout: 'admin'
})

const route = useRoute()
const courseSlug = computed(() => String(route.params.courseSlug ?? ''))

useSeoMeta({
  title: computed(() => (courseSlug.value ? `Editar ${courseSlug.value}` : 'Editar Curso'))
})
</script>

<template>
  <AdminCourseEditorView mode="edit" :course-slug="courseSlug" />
</template>
