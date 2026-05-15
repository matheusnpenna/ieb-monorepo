import type { AdminCourseInput } from '@ieb/shared'
import { createCourseError } from './errors'

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

export const assertAdminCoursePayload = (
  input: AdminCourseInput,
  options?: { currentCourseSlug?: string; resolvedSlug?: string }
) => {
  const normalizedSlug = normalizeCourseSlug(options?.resolvedSlug || input.slug || input.title)
  const normalizedCurrentCourseSlug = options?.currentCourseSlug ? normalizeCourseSlug(options.currentCourseSlug) : null

  if (!input.title.trim()) {
    throw createCourseError(400, 'Informe o titulo do curso.')
  }

  if (!normalizedSlug || !COURSE_SLUG_REGEX.test(normalizedSlug)) {
    throw createCourseError(400, 'Informe um slug de curso valido.')
  }

  if (normalizedCurrentCourseSlug && normalizedSlug !== normalizedCurrentCourseSlug) {
    throw createCourseError(400, 'O slug do curso nao pode ser alterado apos a criacao.')
  }

  if (!input.shortDescription.trim()) {
    throw createCourseError(400, 'Informe a descricao curta do curso.')
  }

  if (!input.description.trim()) {
    throw createCourseError(400, 'Informe a descricao completa do curso.')
  }

  if (!['draft', 'published', 'archived'].includes(input.visibility)) {
    throw createCourseError(400, 'Informe uma visibilidade de curso valida.')
  }

  if (!Number.isFinite(input.totalDurationInMinutes) || input.totalDurationInMinutes < 0) {
    throw createCourseError(400, 'Informe uma duracao total valida para o curso.')
  }

  if (!Number.isFinite(input.requiredCompletionRate) || input.requiredCompletionRate < 0 || input.requiredCompletionRate > 100) {
    throw createCourseError(400, 'Informe um progresso minimo entre 0 e 100.')
  }

  return normalizedSlug
}
