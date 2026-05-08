<script setup lang="ts">
import AdminLessonsListView from '../../../components/admin/AdminLessonsListView.vue'

definePageMeta({
  layout: 'admin'
})

useSeoMeta({
  title: 'Admin Aulas'
})
</script>

<template>
  <AdminLessonsListView />
</template>
