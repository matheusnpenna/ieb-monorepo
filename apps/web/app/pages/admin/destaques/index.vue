<script setup lang="ts">
import AdminHighlightsListView from '../../../components/admin/AdminHighlightsListView.vue'

definePageMeta({
  layout: 'admin'
})

useSeoMeta({
  title: 'Admin Destaques'
})
</script>

<template>
  <AdminHighlightsListView />
</template>
