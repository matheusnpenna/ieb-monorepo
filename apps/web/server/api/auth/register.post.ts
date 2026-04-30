import type { AuthSuccessResponse, UserRegion } from '@ieb/shared'
import { readBody } from 'h3'
import { registerAccount } from '../../utils/auth'

export default defineEventHandler(async (event): Promise<AuthSuccessResponse> => {
  const body = await readBody<{
    classroomUuid?: string
    fullName?: string
    cpf?: string
    email?: string
    password?: string
    region?: UserRegion
  }>(event)

  const user = await registerAccount(event, {
    classroomUuid: body?.classroomUuid || '',
    fullName: body?.fullName || '',
    cpf: body?.cpf || '',
    email: body?.email || '',
    password: body?.password || '',
    region: body?.region || 'feira-de-santana'
  })

  return { user }
})
