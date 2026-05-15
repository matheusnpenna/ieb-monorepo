import type { AdminUserInput, UserRegion, UserRole, UserStatus } from '@ieb/shared'
import { createUserError } from './errors'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const VALID_ROLES = new Set<UserRole>(['admin', 'student'])
const VALID_STATUSES = new Set<UserStatus>(['invited', 'active', 'blocked'])
const VALID_REGIONS = new Set<UserRegion>(['feira-de-santana', 'panambi', 'sertao', 'aluno-externo'])

export const DEFAULT_ADMIN_USERS_PAGE_SIZE = 12
export const MAX_ADMIN_USERS_PAGE_SIZE = 100
export const MANUAL_CLASSROOM_ID = 'manual-admin-enrollment'

export const normalizeEmail = (value: string) => value.trim().toLowerCase()
export const normalizeCpf = (value: string) => value.replace(/\D/g, '')
export const normalizeOptionalText = (value: string | null | undefined) => {
  const normalizedValue = typeof value === 'string' ? value.trim() : ''

  return normalizedValue ? normalizedValue : null
}

export const normalizePositiveInteger = (value: number | undefined, fallbackValue: number) => {
  if (!Number.isFinite(value)) {
    return fallbackValue
  }

  return Math.max(1, Math.trunc(value as number))
}

export const normalizeCourseIds = (courseIds: string[] | undefined) =>
  [...new Set((Array.isArray(courseIds) ? courseIds : []).map((courseId) => courseId.trim()).filter(Boolean))]

export const assertAdminUserInput = (
  input: AdminUserInput,
  options?: {
    hasExistingUser?: boolean
  }
) => {
  const hasExistingUser = Boolean(options?.hasExistingUser)
  const normalizedEmail = normalizeEmail(input.email)
  const normalizedCpf = normalizeCpf(input.cpf)
  const normalizedPassword = typeof input.password === 'string' ? input.password.trim() : ''

  if (!input.fullName.trim()) {
    throw createUserError(400, 'Informe o nome completo do usuario.')
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw createUserError(400, 'Informe um e-mail valido.')
  }

  if (!/^\d{11}$/.test(normalizedCpf)) {
    throw createUserError(400, 'Informe um CPF valido com 11 digitos.')
  }

  if (!VALID_ROLES.has(input.role)) {
    throw createUserError(400, 'Informe um perfil de usuario valido.')
  }

  if (!VALID_STATUSES.has(input.status)) {
    throw createUserError(400, 'Informe um status de usuario valido.')
  }

  if (!VALID_REGIONS.has(input.region)) {
    throw createUserError(400, 'Informe uma regiao valida para o usuario.')
  }

  if (!hasExistingUser && normalizedPassword.length < 6) {
    throw createUserError(400, 'Informe uma senha com pelo menos 6 caracteres.')
  }

  if (hasExistingUser && normalizedPassword && normalizedPassword.length < 6) {
    throw createUserError(400, 'A nova senha precisa ter pelo menos 6 caracteres.')
  }
}
