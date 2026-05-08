<script setup lang="ts">
import AdminModuleEditorView from '../../../components/admin/AdminModuleEditorView.vue'

definePageMeta({
  layout: 'admin'
})

const route = useRoute()
const moduleSlug = computed(() => String(route.params.moduleSlug ?? ''))

useSeoMeta({
  title: computed(() => `Editar modulo ${moduleSlug.value}`.trim())
})
</script>

<template>
  <AdminModuleEditorView mode="edit" :module-slug="moduleSlug" />
</template>
