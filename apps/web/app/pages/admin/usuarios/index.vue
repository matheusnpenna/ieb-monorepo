<script setup lang="ts">
import AdminUsersListView from '../../../components/admin/AdminUsersListView.vue'

definePageMeta({
  layout: 'admin'
})

useSeoMeta({
  title: 'Admin Usuarios'
})
</script>

<template>
  <AdminUsersListView />
</template>
