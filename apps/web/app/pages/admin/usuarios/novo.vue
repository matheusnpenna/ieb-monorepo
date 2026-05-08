<script setup lang="ts">
import AdminUserEditorView from '../../../components/admin/AdminUserEditorView.vue'

definePageMeta({
  layout: 'admin'
})

useSeoMeta({
  title: 'Novo Usuario'
})
</script>

<template>
  <AdminUserEditorView mode="create" />
</template>
