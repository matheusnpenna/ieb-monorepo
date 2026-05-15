import type { AdminClassroomInput } from '@ieb/shared'
import { createClassroomError } from './errors'

const CLASSROOM_UUID_REGEX = /^[a-z0-9-]{8,}$/i

export const normalizeClassroomUuid = (value: string) => value.trim().toLowerCase()

export const isValidClassroomUuid = (value: string) => CLASSROOM_UUID_REGEX.test(value)

export const normalizeLinkedCourseIds = (linkedCourseIds: string[]) => [
  ...new Set(linkedCourseIds.map((courseId) => courseId.trim()).filter(Boolean))
]

export const assertAdminClassroomPayload = (
  input: AdminClassroomInput,
  options?: {
    currentClassroomUuid?: string | null
    resolvedUuid?: string
  }
) => {
  const normalizedUuid = normalizeClassroomUuid(options?.resolvedUuid || input.uuid)
  const normalizedCurrentUuid = options?.currentClassroomUuid ? normalizeClassroomUuid(options.currentClassroomUuid) : null

  if (!input.name.trim()) {
    throw createClassroomError(400, 'Informe o nome da turma.')
  }

  if (!normalizedUuid || !isValidClassroomUuid(normalizedUuid)) {
    throw createClassroomError(400, 'Informe um UUID valido para a turma.')
  }

  if (normalizedCurrentUuid && normalizedUuid !== normalizedCurrentUuid) {
    throw createClassroomError(400, 'O UUID da turma nao pode ser alterado apos a criacao.')
  }

  if (!input.description.trim()) {
    throw createClassroomError(400, 'Informe a descricao da turma.')
  }

  const registrationStartsAt = input.registrationStartsAt?.trim() ? input.registrationStartsAt.trim() : null
  const registrationEndsAt = input.registrationEndsAt?.trim() ? input.registrationEndsAt.trim() : null

  if (registrationStartsAt && Number.isNaN(Date.parse(registrationStartsAt))) {
    throw createClassroomError(400, 'Informe uma data inicial valida para a janela de cadastro.')
  }

  if (registrationEndsAt && Number.isNaN(Date.parse(registrationEndsAt))) {
    throw createClassroomError(400, 'Informe uma data final valida para a janela de cadastro.')
  }

  if (registrationStartsAt && registrationEndsAt && Date.parse(registrationStartsAt) > Date.parse(registrationEndsAt)) {
    throw createClassroomError(400, 'A data inicial da janela de cadastro nao pode ser maior que a data final.')
  }

  return {
    uuid: normalizedUuid,
    registrationStartsAt,
    registrationEndsAt
  }
}
