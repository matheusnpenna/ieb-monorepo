<script setup lang="ts">
import AdminHighlightEditorView from '../../../components/admin/AdminHighlightEditorView.vue'

definePageMeta({
  layout: 'admin'
})

useSeoMeta({
  title: 'Novo Destaque'
})
</script>

<template>
  <AdminHighlightEditorView mode="create" />
</template>
