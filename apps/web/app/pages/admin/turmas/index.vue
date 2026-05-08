<script setup lang="ts">
import AdminClassroomsListView from '../../../components/admin/AdminClassroomsListView.vue'

definePageMeta({
  layout: 'admin'
})

useSeoMeta({
  title: 'Admin Turmas'
})
</script>

<template>
  <AdminClassroomsListView />
</template>
