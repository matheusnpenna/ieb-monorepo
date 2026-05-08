<script setup lang="ts">
import AdminClassroomEditorView from '../../../components/admin/AdminClassroomEditorView.vue'

definePageMeta({
  layout: 'admin'
})

const route = useRoute()
const classroomUuid = computed(() => String(route.params.classroomUuid || ''))

useSeoMeta({
  title: 'Editar Turma'
})
</script>

<template>
  <AdminClassroomEditorView mode="edit" :classroom-uuid="classroomUuid" />
</template>
