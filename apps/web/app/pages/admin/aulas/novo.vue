<script setup lang="ts">
import AdminLessonEditorView from '../../../components/admin/AdminLessonEditorView.vue'

definePageMeta({
  layout: 'admin'
})

useSeoMeta({
  title: 'Nova aula'
})
</script>

<template>
  <AdminLessonEditorView mode="create" />
</template>
