import type {
  AdminClassroomInput,
  AdminClassroomResponse,
  AdminClassroomsResponse,
  AuthSessionContext
} from '@ieb/shared'
import { readBody, setResponseStatus, type H3Event } from 'h3'
import { requireAuthSession } from '../../../auth/interfaces/http/session'
import { getClassroomsModule } from '../../classrooms.module'

const getErrorStatusCode = (error: unknown) =>
  typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number'
    ? error.statusCode
    : 500

const getErrorStatusMessage = (error: unknown, fallbackMessage: string) =>
  typeof error === 'object' &&
  error !== null &&
  'statusMessage' in error &&
  typeof error.statusMessage === 'string' &&
  error.statusMessage
    ? error.statusMessage
    : fallbackMessage

const normalizeClassroomInput = (body: AdminClassroomInput | null | undefined): AdminClassroomInput => ({
  name: body?.name || '',
  uuid: body?.uuid || '',
  description: body?.description || '',
  registrationOpen: Boolean(body?.registrationOpen),
  registrationStartsAt: body?.registrationStartsAt ?? null,
  registrationEndsAt: body?.registrationEndsAt ?? null,
  linkedCourseIds: Array.isArray(body?.linkedCourseIds) ? body.linkedCourseIds : []
})

const writeFailureLog = async (
  session: AuthSessionContext | null,
  input: {
    action: 'create' | 'update' | 'delete'
    targetId: string
    summary: string
    statusCode: number
    statusMessage: string
    classroomUuid?: string | null
  }
) => {
  if (!session) {
    return
  }

  try {
    await getClassroomsModule().adminLog.write(session, {
      action: input.action,
      targetCollection: 'classrooms',
      targetId: input.targetId,
      summary: input.summary,
      metadata: {
        statusCode: input.statusCode,
        statusMessage: input.statusMessage,
        ...(input.classroomUuid === undefined ? {} : { classroomUuid: input.classroomUuid })
      }
    })
  } catch {
    // Preserve original error response.
  }
}

export const handleListAdminClassrooms = async (event: H3Event): Promise<AdminClassroomsResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const classrooms = await getClassroomsModule().service.listAdminClassroomsForManagement(session)

    return {
      status: 'success',
      data: classrooms
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel carregar as turmas do painel.')

    await writeFailureLog(session, {
      action: 'update',
      targetId: 'list',
      summary: 'Falha ao carregar listagem administrativa de turmas.',
      statusCode,
      statusMessage
    })

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: []
    }
  }
}

export const handleCreateAdminClassroom = async (event: H3Event): Promise<AdminClassroomResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminClassroomInput>(event)
    const classroom = await getClassroomsModule().service.createAdminClassroom(
      session,
      normalizeClassroomInput(body)
    )

    return {
      status: 'success',
      data: classroom
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel criar a turma.')

    await writeFailureLog(session, {
      action: 'create',
      targetId: 'new',
      summary: 'Falha ao criar turma no painel administrativo.',
      statusCode,
      statusMessage
    })

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
}

export const handleGetAdminClassroom = async (event: H3Event): Promise<AdminClassroomResponse> => {
  let session: AuthSessionContext | null = null
  const classroomUuid = String(event.context.params?.classroomUuid ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const classroom = await getClassroomsModule().service.getAdminClassroomByUuid(session, classroomUuid)

    return {
      status: 'success',
      data: classroom
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel carregar a turma.')

    await writeFailureLog(session, {
      action: 'update',
      targetId: classroomUuid || 'classroom',
      summary: 'Falha ao carregar turma no painel administrativo.',
      statusCode,
      statusMessage,
      classroomUuid: classroomUuid || null
    })

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
}

export const handleUpdateAdminClassroom = async (event: H3Event): Promise<AdminClassroomResponse> => {
  let session: AuthSessionContext | null = null
  const classroomUuid = String(event.context.params?.classroomUuid ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminClassroomInput>(event)
    const classroom = await getClassroomsModule().service.updateAdminClassroomByUuid(
      session,
      classroomUuid,
      normalizeClassroomInput(body)
    )

    return {
      status: 'success',
      data: classroom
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel atualizar a turma.')

    await writeFailureLog(session, {
      action: 'update',
      targetId: classroomUuid || 'classroom',
      summary: 'Falha ao atualizar turma no painel administrativo.',
      statusCode,
      statusMessage,
      classroomUuid: classroomUuid || null
    })

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
}

export const handleDeleteAdminClassroom = async (event: H3Event): Promise<AdminClassroomResponse> => {
  let session: AuthSessionContext | null = null
  const classroomUuid = String(event.context.params?.classroomUuid ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const classroom = await getClassroomsModule().service.deleteAdminClassroomByUuid(session, classroomUuid)

    return {
      status: 'success',
      data: classroom
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel remover a turma.')

    await writeFailureLog(session, {
      action: 'delete',
      targetId: classroomUuid || 'classroom',
      summary: 'Falha ao remover turma no painel administrativo.',
      statusCode,
      statusMessage,
      classroomUuid: classroomUuid || null
    })

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
}
