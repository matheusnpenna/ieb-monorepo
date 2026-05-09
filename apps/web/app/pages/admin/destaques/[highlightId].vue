<script setup lang="ts">
import AdminHighlightEditorView from '../../../components/admin/AdminHighlightEditorView.vue'

definePageMeta({
  layout: 'admin'
})

useSeoMeta({
  title: 'Editar Destaque'
})

const route = useRoute()
const highlightId = computed(() => String(route.params.highlightId || ''))
</script>

<template>
  <AdminHighlightEditorView mode="edit" :highlight-id="highlightId" />
</template>
