import type { AdminClassroomResponse, AuthSessionContext } from '@ieb/shared'
import { defineEventHandler, setResponseStatus } from 'h3'
import { requireAuthSession, writeAdminLog } from '../../../../utils/auth'
import { deleteAdminClassroomByUuid } from '../../../../utils/classrooms'

export default defineEventHandler(async (event): Promise<AdminClassroomResponse> => {
  let session: AuthSessionContext | null = null
  const classroomUuid = String(event.context.params?.classroomUuid ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const classroom = await deleteAdminClassroomByUuid(session, classroomUuid)

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
        : 'Nao foi possivel remover a turma.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'delete',
          targetCollection: 'classrooms',
          targetId: classroomUuid || 'classroom',
          summary: 'Falha ao remover turma no painel administrativo.',
          metadata: {
            statusCode,
            statusMessage,
            classroomUuid: classroomUuid || null
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
