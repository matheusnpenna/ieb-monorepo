<script setup lang="ts">
import AdminAssessmentEditorView from '../../../components/admin/AdminAssessmentEditorView.vue'

definePageMeta({
  layout: 'admin'
})

const route = useRoute()
const assessmentSlug = computed(() => String(route.params.assessmentSlug ?? ''))

useSeoMeta({
  title: computed(() => `Editar avaliacao ${assessmentSlug.value}`.trim())
})
</script>

<template>
  <AdminAssessmentEditorView mode="edit" :assessment-slug="assessmentSlug" />
</template>
