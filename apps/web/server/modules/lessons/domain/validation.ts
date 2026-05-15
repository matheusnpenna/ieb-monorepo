import type { AdminLessonInput, Lesson } from '@ieb/shared'
import { createLessonError } from './errors'

const COURSE_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const normalizeOptionalText = (value: string | null | undefined) => {
  const normalizedValue = typeof value === 'string' ? value.trim() : ''

  return normalizedValue ? normalizedValue : null
}

export const normalizeCourseSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

export const createFourDigitSlugHash = (value: string, salt = 0) => {
  const normalizedValue = `${value}:${salt}`
  let hash = 0

  for (let index = 0; index < normalizedValue.length; index += 1) {
    hash = (hash * 31 + normalizedValue.charCodeAt(index)) % 9000
  }

  return String(hash + 1000)
}

export const assertAdminLessonPayload = (
  input: AdminLessonInput,
  options?: {
    existingLesson?: Lesson | null
    resolvedSlug?: string
  }
) => {
  const existingLesson = options?.existingLesson || null
  const normalizedCourseId = normalizeCourseSlug(input.courseId)
  const normalizedModuleId = normalizeCourseSlug(input.moduleId)
  const normalizedSlug = normalizeCourseSlug(options?.resolvedSlug || input.slug || input.title)

  if (!normalizedCourseId) {
    throw createLessonError(400, 'Selecione um curso valido para a aula.')
  }

  if (!normalizedModuleId) {
    throw createLessonError(400, 'Selecione um modulo valido para a aula.')
  }

  if (existingLesson && normalizedCourseId !== existingLesson.courseId) {
    throw createLessonError(400, 'O curso da aula nao pode ser alterado apos a criacao.')
  }

  if (existingLesson && normalizedModuleId !== existingLesson.moduleId) {
    throw createLessonError(400, 'O modulo da aula nao pode ser alterado apos a criacao.')
  }

  if (!input.title.trim()) {
    throw createLessonError(400, 'Informe o titulo da aula.')
  }

  if (!normalizedSlug || !COURSE_SLUG_REGEX.test(normalizedSlug)) {
    throw createLessonError(400, 'Informe um slug de aula valido.')
  }

  if (existingLesson && normalizedSlug !== existingLesson.slug) {
    throw createLessonError(400, 'O slug da aula nao pode ser alterado apos a criacao.')
  }

  if (!input.description.trim()) {
    throw createLessonError(400, 'Informe a descricao da aula.')
  }

  if (!Number.isFinite(input.order) || input.order < 1) {
    throw createLessonError(400, 'Informe uma ordem valida para a aula.')
  }

  if (!['video', 'text', 'audio'].includes(input.contentType)) {
    throw createLessonError(400, 'Informe um tipo de conteudo valido para a aula.')
  }

  if (input.videoProvider && !['youtube', 'vimeo', 'upload', 'embed'].includes(input.videoProvider)) {
    throw createLessonError(400, 'Informe um provedor de video valido para a aula.')
  }

  if (!Number.isFinite(input.durationInMinutes) || input.durationInMinutes < 0) {
    throw createLessonError(400, 'Informe uma duracao valida para a aula.')
  }

  return {
    courseId: normalizedCourseId,
    moduleId: normalizedModuleId,
    slug: normalizedSlug
  }
}
