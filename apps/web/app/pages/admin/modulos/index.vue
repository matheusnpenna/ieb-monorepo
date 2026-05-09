<script setup lang="ts">
import AdminModulesListView from '../../../components/admin/AdminModulesListView.vue'

definePageMeta({
  layout: 'admin'
})

useSeoMeta({
  title: 'Admin Modulos'
})
</script>

<template>
  <AdminModulesListView />
</template>
