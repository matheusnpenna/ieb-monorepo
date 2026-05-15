import { defineEventHandler, getRequestPath } from 'h3'
import { resolveAuthSession } from '../modules/auth/interfaces/http/session'

export default defineEventHandler(async (event) => {
  const pathname = getRequestPath(event)

  if (!pathname.includes('/api/')) return

  ;(event.context as { authSession?: Awaited<ReturnType<typeof resolveAuthSession>> }).authSession =
    await resolveAuthSession(event)
})
