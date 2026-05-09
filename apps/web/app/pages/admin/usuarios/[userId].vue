<script setup lang="ts">
import AdminUserEditorView from '../../../components/admin/AdminUserEditorView.vue'

definePageMeta({
  layout: 'admin'
})

const route = useRoute()
const userId = computed(() => String(route.params.userId || ''))

useSeoMeta({
  title: 'Editar Usuario'
})
</script>

<template>
  <AdminUserEditorView mode="edit" :user-id="userId" />
</template>
