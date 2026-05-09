<script setup lang="ts">
import AdminAssessmentsListView from '../../../components/admin/AdminAssessmentsListView.vue'

definePageMeta({
  layout: 'admin'
})

useSeoMeta({
  title: 'Admin Avaliacoes'
})
</script>

<template>
  <AdminAssessmentsListView />
</template>
