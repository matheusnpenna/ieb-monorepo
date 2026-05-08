<script setup lang="ts">
import AdminModuleEditorView from '../../../components/admin/AdminModuleEditorView.vue'

definePageMeta({
  layout: 'admin'
})

useSeoMeta({
  title: 'Novo modulo'
})
</script>

<template>
  <AdminModuleEditorView mode="create" />
</template>
