import type { AdminLessonsResponse, AuthSessionContext } from '@ieb/shared'
import { defineEventHandler, getQuery, setResponseStatus } from 'h3'
import { requireAuthSession, writeAdminLog } from '../../../utils/auth'
import { listAdminLessonsForManagement } from '../../../utils/courses'

export default defineEventHandler(async (event): Promise<AdminLessonsResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const query = getQuery(event)
    const lessons = await listAdminLessonsForManagement(session, {
      courseId: typeof query.courseId === 'string' ? query.courseId : '',
      moduleId: typeof query.moduleId === 'string' ? query.moduleId : ''
    })

    return {
      status: 'success',
      data: lessons
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
        : 'Nao foi possivel carregar as aulas do painel.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'update',
          targetCollection: 'lessons',
          targetId: 'list',
          summary: 'Falha ao carregar listagem administrativa de aulas.',
          metadata: {
            statusCode,
            statusMessage
          }
        })
      } catch {
        // Preserve the original error response if admin log persistence fails.
      }
    }

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: []
    }
  }
})
