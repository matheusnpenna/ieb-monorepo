import type { AuthSuccessResponse } from '@ieb/shared'
import { readBody } from 'h3'
import { loginWithEmailAndPassword, writeAdminLog } from '../../utils/auth'

export default defineEventHandler(async (event): Promise<AuthSuccessResponse> => {
  const body = await readBody<{ email?: string; password?: string }>(event)
  const user = await loginWithEmailAndPassword(event, {
    email: body?.email || '',
    password: body?.password || ''
  })

  await writeAdminLog(
    {
      user,
      issuedAt: new Date().toISOString()
    },
    'login',
    'Login realizado com sucesso no painel/plataforma.'
  )

  return { user }
})
