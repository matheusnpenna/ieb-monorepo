<script setup lang="ts">
import AdminAssessmentEditorView from '../../../components/admin/AdminAssessmentEditorView.vue'

definePageMeta({
  layout: 'admin'
})

useSeoMeta({
  title: 'Nova avaliacao'
})
</script>

<template>
  <AdminAssessmentEditorView mode="create" />
</template>
