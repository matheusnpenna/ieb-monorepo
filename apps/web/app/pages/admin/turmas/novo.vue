<script setup lang="ts">
import AdminClassroomEditorView from '../../../components/admin/AdminClassroomEditorView.vue'

definePageMeta({
  layout: 'admin'
})

useSeoMeta({
  title: 'Nova Turma'
})
</script>

<template>
  <AdminClassroomEditorView mode="create" />
</template>
