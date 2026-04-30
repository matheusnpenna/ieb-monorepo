import type { RegistrationStatusResponse } from '@ieb/shared'
import { getQuery } from 'h3'
import { getRegistrationStatus } from '../../utils/auth'

export default defineEventHandler(async (event): Promise<RegistrationStatusResponse> => {
  const query = getQuery(event)
  const classroomUuid = typeof query.classroomUuid === 'string' ? query.classroomUuid : ''

  return await getRegistrationStatus(classroomUuid)
})
