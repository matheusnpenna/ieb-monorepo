import type { AdminModuleInput, CourseModule } from '@ieb/shared'
import { createCourseModuleError } from './errors'

const COURSE_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

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

export const assertAdminModulePayload = (
  input: AdminModuleInput,
  options?: {
    existingModule?: CourseModule | null
    resolvedSlug?: string
  }
) => {
  const existingModule = options?.existingModule || null
  const normalizedCourseId = normalizeCourseSlug(input.courseId)
  const normalizedSlug = normalizeCourseSlug(options?.resolvedSlug || input.slug || input.title)

  if (!normalizedCourseId) {
    throw createCourseModuleError(400, 'Selecione um curso valido para o modulo.')
  }

  if (existingModule && normalizedCourseId !== existingModule.courseId) {
    throw createCourseModuleError(400, 'O curso do modulo nao pode ser alterado apos a criacao.')
  }

  if (!input.title.trim()) {
    throw createCourseModuleError(400, 'Informe o titulo do modulo.')
  }

  if (!normalizedSlug || !COURSE_SLUG_REGEX.test(normalizedSlug)) {
    throw createCourseModuleError(400, 'Informe um slug de modulo valido.')
  }

  if (existingModule && normalizedSlug !== existingModule.slug) {
    throw createCourseModuleError(400, 'O slug do modulo nao pode ser alterado apos a criacao.')
  }

  if (!input.description.trim()) {
    throw createCourseModuleError(400, 'Informe a descricao do modulo.')
  }

  if (!Number.isFinite(input.order) || input.order < 1) {
    throw createCourseModuleError(400, 'Informe uma ordem valida para o modulo.')
  }

  if (!Number.isFinite(input.estimatedDurationInMinutes) || input.estimatedDurationInMinutes < 0) {
    throw createCourseModuleError(400, 'Informe uma duracao estimada valida para o modulo.')
  }

  return {
    courseId: normalizedCourseId,
    slug: normalizedSlug
  }
}
