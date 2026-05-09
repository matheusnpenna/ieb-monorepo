<script setup lang="ts">
import AdminLogsListView from '../../../components/admin/AdminLogsListView.vue'

definePageMeta({
  layout: 'admin'
})

useSeoMeta({
  title: 'Admin Logs'
})
</script>

<template>
  <AdminLogsListView />
</template>
