import { clearAuthSessionCookie, requireAuthSession, writeAdminLog } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const session = await requireAuthSession(event).catch(() => null)

  if (session) {
    await writeAdminLog(session, 'logout', 'Logout realizado com sucesso no painel/plataforma.')
  }

  clearAuthSessionCookie(event)

  return {
    success: true
  }
})
