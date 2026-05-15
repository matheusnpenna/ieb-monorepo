import type { Classroom, User, UserRegion } from '@ieb/shared'
import { createAuthError } from './errors'

export const REGISTRATION_CLOSED_MESSAGE =
  'Periodo de cadastro encerrado. Para saber mais, entre em contato com o suporte responsável'

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const VALID_REGIONS = new Set<UserRegion>(['feira-de-santana', 'panambi', 'sertao', 'aluno-externo'])

export const normalizeEmail = (value: string) => value.trim().toLowerCase()
export const normalizeCpf = (value: string) => value.replace(/\D/g, '')
export const normalizeOptionalText = (value: string | null | undefined) => {
  const normalizedValue = typeof value === 'string' ? value.trim() : ''

  return normalizedValue ? normalizedValue : null
}

export const fallbackNameFromEmail = (email: string) => {
  const [localPart] = email.split('@')

  return (localPart || '')
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export const assertEmailAndPassword = (email: string, password: string) => {
  if (!EMAIL_REGEX.test(email)) {
    throw createAuthError(400, 'Informe um e-mail valido.')
  }

  if (!password || password.length < 6) {
    throw createAuthError(400, 'A senha precisa ter pelo menos 6 caracteres.')
  }
}

export const assertRegisterPayload = (input: {
  fullName: string
  cpf: string
  email: string
  password: string
  region: User['region']
}) => {
  if (!input.fullName.trim()) {
    throw createAuthError(400, 'Informe o nome completo.')
  }

  if (normalizeCpf(input.cpf).length !== 11) {
    throw createAuthError(400, 'Informe um CPF valido.')
  }

  if (!VALID_REGIONS.has(input.region)) {
    throw createAuthError(400, 'Informe uma regiao valida.')
  }

  assertEmailAndPassword(input.email, input.password)
}

export const assertUserCanAccessPlatform = (user: User) => {
  if (user.deletedAt) {
    throw createAuthError(403, 'Sua conta nao esta mais disponivel para acesso.')
  }

  if (user.status === 'blocked') {
    throw createAuthError(403, 'Sua conta esta bloqueada. Entre em contato com o suporte.')
  }
}

export const isRegistrationWindowOpen = (classroom: Classroom) => {
  if (classroom.deletedAt || !classroom.registrationOpen) {
    return false
  }

  const now = new Date()
  const startsAt = classroom.registrationStartsAt ? new Date(classroom.registrationStartsAt) : null
  const endsAt = classroom.registrationEndsAt ? new Date(classroom.registrationEndsAt) : null

  if (startsAt && now < startsAt) {
    return false
  }

  if (endsAt && now > endsAt) {
    return false
  }

  return true
}

export const mapIdentityErrorMessage = (code: string | undefined) => {
  switch (code) {
    case 'EMAIL_EXISTS':
      return 'Ja existe uma conta cadastrada com este e-mail.'
    case 'EMAIL_NOT_FOUND':
      return 'Nao encontramos uma conta com este e-mail.'
    case 'INVALID_PASSWORD':
    case 'INVALID_LOGIN_CREDENTIALS':
      return 'E-mail ou senha invalidos.'
    case 'INVALID_EMAIL':
      return 'Informe um e-mail valido.'
    case 'USER_DISABLED':
      return 'Esta conta foi desativada.'
    case 'WEAK_PASSWORD':
      return 'A senha precisa ter pelo menos 6 caracteres.'
    case 'TOO_MANY_ATTEMPTS_TRY_LATER':
      return 'Muitas tentativas. Aguarde um pouco antes de tentar novamente.'
    case 'OPERATION_NOT_ALLOWED':
      return 'A autenticacao por e-mail e senha nao esta habilitada no Firebase.'
    default:
      return 'Nao foi possivel concluir a autenticacao no momento.'
  }
}
