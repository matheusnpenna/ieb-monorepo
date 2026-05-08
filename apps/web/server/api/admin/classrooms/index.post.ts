import type { AdminClassroomInput, AdminClassroomResponse, AuthSessionContext } from '@ieb/shared'
import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { requireAuthSession, writeAdminLog } from '../../../utils/auth'
import { createAdminClassroom } from '../../../utils/classrooms'

export default defineEventHandler(async (event): Promise<AdminClassroomResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminClassroomInput>(event)
    const classroom = await createAdminClassroom(session, {
      name: body?.name || '',
      uuid: body?.uuid || '',
      description: body?.description || '',
      registrationOpen: Boolean(body?.registrationOpen),
      registrationStartsAt: body?.registrationStartsAt ?? null,
      registrationEndsAt: body?.registrationEndsAt ?? null,
      linkedCourseIds: Array.isArray(body?.linkedCourseIds) ? body.linkedCourseIds : []
    })

    return {
      status: 'success',
      data: classroom
    }
  } catch (error) {
    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number'
        ? error.statusCode
        : 500
    const statusMessage =
      typeof error === 'object' &&
      error !== null &&
      'statusMessage' in error &&
      typeof error.statusMessage === 'string' &&
      error.statusMessage
        ? error.statusMessage
        : 'Nao foi possivel criar a turma.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'create',
          targetCollection: 'classrooms',
          targetId: 'new',
          summary: 'Falha ao criar turma no painel administrativo.',
          metadata: {
            statusCode,
            statusMessage
          }
        })
      } catch {
        // Preserve original error response.
      }
    }

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
})
