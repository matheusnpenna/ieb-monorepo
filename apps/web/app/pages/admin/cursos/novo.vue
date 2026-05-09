<script setup lang="ts">
import AdminCourseEditorView from '../../../components/admin/AdminCourseEditorView.vue'

definePageMeta({
  layout: 'admin'
})

useSeoMeta({
  title: 'Novo Curso'
})
</script>

<template>
  <AdminCourseEditorView mode="create" />
</template>
