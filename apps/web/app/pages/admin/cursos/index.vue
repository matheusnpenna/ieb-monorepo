<script setup lang="ts">
import AdminCoursesListView from '../../../components/admin/AdminCoursesListView.vue'

definePageMeta({
  layout: 'admin'
})

useSeoMeta({
  title: 'Admin Cursos'
})
</script>

<template>
  <AdminCoursesListView />
</template>
