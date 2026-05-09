import type { AdminClassroomInput, AuthSessionContext, Classroom, Course } from '@ieb/shared'
import { createError } from 'h3'
import { writeAdminLog } from './auth'
import { getFirebaseAdminCollection } from './firebase-admin'

const CLASSROOM_UUID_REGEX = /^[a-z0-9-]{8,}$/i

const toTimestamp = () => new Date().toISOString()

const createHttpError = (statusCode: number, statusMessage: string) =>
  createError({
    statusCode,
    statusMessage
  })

const toClassroomDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    id: snapshot.id,
    ...(snapshot.data() as Omit<Classroom, 'id'>)
  }) as Classroom

const toCourseDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    id: snapshot.id,
    ...(snapshot.data() as Omit<Course, 'id'>)
  }) as Course

const normalizeClassroomUuid = (value: string) => value.trim().toLowerCase()

const getCourseById = async (courseId: string) => {
  const snapshot = await getFirebaseAdminCollection('courses').doc(courseId).get()

  if (!snapshot.exists) {
    return null
  }

  return toCourseDocument(snapshot)
}

const getCourseBySlug = async (courseSlug: string) => {
  const courseById = await getCourseById(courseSlug)

  if (courseById) {
    return courseById
  }

  const snapshot = await getFirebaseAdminCollection('courses').where('slug', '==', courseSlug).get()
  const validDocument = snapshot.docs.find((document) => {
    const course = toCourseDocument(document)

    return !course.deletedAt
  })

  return validDocument ? toCourseDocument(validDocument) : null
}

const getClassroomById = async (classroomId: string) => {
  const snapshot = await getFirebaseAdminCollection('classrooms').doc(classroomId).get()

  if (!snapshot.exists) {
    return null
  }

  return toClassroomDocument(snapshot)
}

const getClassroomByUuidInternal = async (classroomUuid: string) => {
  const classroomById = await getClassroomById(classroomUuid)

  if (classroomById) {
    return classroomById
  }

  const snapshot = await getFirebaseAdminCollection('classrooms').where('uuid', '==', classroomUuid).get()
  const validDocument = snapshot.docs.find((document) => {
    const classroom = toClassroomDocument(document)

    return !classroom.deletedAt
  })

  return validDocument ? toClassroomDocument(validDocument) : null
}

const listAdminClassrooms = async () => {
  const snapshot = await getFirebaseAdminCollection('classrooms').get()

  return snapshot.docs
    .map(toClassroomDocument)
    .filter((classroom) => !classroom.deletedAt)
    .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
}

const resolveLinkedCourseIds = async (linkedCourseIds: string[]) => {
  const normalizedIds = [...new Set(linkedCourseIds.map((courseId) => courseId.trim()).filter(Boolean))]

  if (normalizedIds.length === 0) {
    throw createHttpError(400, 'Selecione pelo menos um curso para vincular a turma.')
  }

  const resolvedCourses = await Promise.all(
    normalizedIds.map(async (courseId) => {
      const courseById = await getCourseById(courseId)

      if (courseById && !courseById.deletedAt) {
        return courseById
      }

      const courseBySlug = await getCourseBySlug(courseId)

      if (courseBySlug && !courseBySlug.deletedAt) {
        return courseBySlug
      }

      return null
    })
  )

  if (resolvedCourses.some((course) => !course)) {
    throw createHttpError(400, 'Um ou mais cursos vinculados nao foram encontrados.')
  }

  return resolvedCourses.map((course) => course!.id)
}

const assertAdminClassroomPayload = async (
  input: AdminClassroomInput,
  options?: {
    currentClassroomUuid?: string | null
    resolvedUuid?: string
  }
) => {
  const normalizedUuid = normalizeClassroomUuid(options?.resolvedUuid || input.uuid)
  const normalizedCurrentUuid = options?.currentClassroomUuid ? normalizeClassroomUuid(options.currentClassroomUuid) : null

  if (!input.name.trim()) {
    throw createHttpError(400, 'Informe o nome da turma.')
  }

  if (!normalizedUuid || !CLASSROOM_UUID_REGEX.test(normalizedUuid)) {
    throw createHttpError(400, 'Informe um UUID valido para a turma.')
  }

  if (normalizedCurrentUuid && normalizedUuid !== normalizedCurrentUuid) {
    throw createHttpError(400, 'O UUID da turma nao pode ser alterado apos a criacao.')
  }

  if (!input.description.trim()) {
    throw createHttpError(400, 'Informe a descricao da turma.')
  }

  const registrationStartsAt = input.registrationStartsAt?.trim() ? input.registrationStartsAt.trim() : null
  const registrationEndsAt = input.registrationEndsAt?.trim() ? input.registrationEndsAt.trim() : null

  if (registrationStartsAt && Number.isNaN(Date.parse(registrationStartsAt))) {
    throw createHttpError(400, 'Informe uma data inicial valida para a janela de cadastro.')
  }

  if (registrationEndsAt && Number.isNaN(Date.parse(registrationEndsAt))) {
    throw createHttpError(400, 'Informe uma data final valida para a janela de cadastro.')
  }

  if (registrationStartsAt && registrationEndsAt && Date.parse(registrationStartsAt) > Date.parse(registrationEndsAt)) {
    throw createHttpError(400, 'A data inicial da janela de cadastro nao pode ser maior que a data final.')
  }

  const linkedCourseIds = await resolveLinkedCourseIds(input.linkedCourseIds)

  return {
    uuid: normalizedUuid,
    registrationStartsAt,
    registrationEndsAt,
    linkedCourseIds
  }
}

const resolveUniqueAdminClassroomUuid = async (inputUuid: string) => {
  const normalizedRequestedUuid = normalizeClassroomUuid(inputUuid)
  const requestedUuid = normalizedRequestedUuid && CLASSROOM_UUID_REGEX.test(normalizedRequestedUuid)
    ? normalizedRequestedUuid
    : crypto.randomUUID()

  const existingRequestedClassroom = await getClassroomById(requestedUuid)

  if (!existingRequestedClassroom) {
    return requestedUuid
  }

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const nextUuid = crypto.randomUUID()
    const existingClassroom = await getClassroomById(nextUuid)

    if (!existingClassroom) {
      return nextUuid
    }
  }

  throw createHttpError(500, 'Nao foi possivel gerar um UUID unico para a turma.')
}

const buildClassroomPayload = async (
  input: AdminClassroomInput,
  options: {
    existingClassroom?: Classroom | null
    resolvedUuid?: string
  }
) => {
  const existingClassroom = options.existingClassroom || null
  const normalizedPayload = await assertAdminClassroomPayload(input, {
    currentClassroomUuid: existingClassroom?.uuid || null,
    resolvedUuid: options.resolvedUuid
  })
  const timestamp = toTimestamp()

  return {
    name: input.name.trim(),
    uuid: normalizedPayload.uuid,
    description: input.description.trim(),
    registrationOpen: Boolean(input.registrationOpen),
    registrationStartsAt: normalizedPayload.registrationStartsAt,
    registrationEndsAt: normalizedPayload.registrationEndsAt,
    linkedCourseIds: normalizedPayload.linkedCourseIds,
    createdAt: existingClassroom?.createdAt || timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    createdBy: existingClassroom?.createdBy || null,
    updatedBy: null,
    deletedBy: null
  } satisfies Omit<Classroom, 'id'>
}

export const listAdminClassroomsForManagement = async (session: AuthSessionContext) => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  return await listAdminClassrooms()
}

export const getAdminClassroomByUuid = async (session: AuthSessionContext, classroomUuid: string) => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const normalizedUuid = normalizeClassroomUuid(classroomUuid)

  if (!normalizedUuid) {
    throw createHttpError(400, 'Informe um UUID valido para a turma.')
  }

  const classroom = await getClassroomByUuidInternal(normalizedUuid)

  if (!classroom || classroom.deletedAt) {
    throw createHttpError(404, 'Turma nao encontrada.')
  }

  return classroom
}

export const createAdminClassroom = async (session: AuthSessionContext, input: AdminClassroomInput) => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const resolvedUuid = await resolveUniqueAdminClassroomUuid(input.uuid)
  const payload = await buildClassroomPayload(input, { resolvedUuid })

  await getFirebaseAdminCollection('classrooms').doc(payload.uuid).set({
    ...payload,
    createdBy: session.user.id,
    updatedBy: session.user.id
  })

  const createdClassroom: Classroom = {
    ...payload,
    id: payload.uuid,
    createdBy: session.user.id,
    updatedBy: session.user.id
  }

  await writeAdminLog(session, {
    action: 'create',
    targetCollection: 'classrooms',
    targetId: createdClassroom.id,
    summary: 'Criou uma nova turma no painel administrativo.',
    metadata: {
      uuid: createdClassroom.uuid,
      linkedCourseIds: createdClassroom.linkedCourseIds
    }
  })

  return createdClassroom
}

export const updateAdminClassroomByUuid = async (
  session: AuthSessionContext,
  classroomUuid: string,
  input: AdminClassroomInput
) => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const existingClassroom = await getAdminClassroomByUuid(session, classroomUuid)
  const payload = await buildClassroomPayload(input, {
    existingClassroom,
    resolvedUuid: existingClassroom.uuid
  })

  await getFirebaseAdminCollection('classrooms').doc(existingClassroom.id).set(
    {
      ...payload,
      createdBy: existingClassroom.createdBy,
      updatedBy: session.user.id
    },
    { merge: true }
  )

  const updatedClassroom: Classroom = {
    ...payload,
    id: existingClassroom.id,
    createdBy: existingClassroom.createdBy,
    updatedBy: session.user.id
  }

  await writeAdminLog(session, {
    action: 'update',
    targetCollection: 'classrooms',
    targetId: updatedClassroom.id,
    summary: 'Atualizou uma turma do painel administrativo.',
    metadata: {
      uuid: updatedClassroom.uuid,
      linkedCourseIds: updatedClassroom.linkedCourseIds
    }
  })

  return updatedClassroom
}

export const deleteAdminClassroomByUuid = async (session: AuthSessionContext, classroomUuid: string) => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const existingClassroom = await getAdminClassroomByUuid(session, classroomUuid)
  const timestamp = toTimestamp()

  await getFirebaseAdminCollection('classrooms').doc(existingClassroom.id).set(
    {
      deletedAt: timestamp,
      deletedBy: session.user.id,
      updatedAt: timestamp,
      updatedBy: session.user.id
    },
    { merge: true }
  )

  const deletedClassroom: Classroom = {
    ...existingClassroom,
    deletedAt: timestamp,
    deletedBy: session.user.id,
    updatedAt: timestamp,
    updatedBy: session.user.id
  }

  await writeAdminLog(session, {
    action: 'delete',
    targetCollection: 'classrooms',
    targetId: deletedClassroom.id,
    summary: 'Excluiu uma turma do painel administrativo.',
    metadata: {
      uuid: deletedClassroom.uuid
    }
  })

  return deletedClassroom
}
