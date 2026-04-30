import { defineEventHandler, getRequestPath } from 'h3'
import { resolveAuthSession } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const pathname = event.req.url

  if (!pathname.includes('/api/')) return

  ;(event.context as { authSession?: Awaited<ReturnType<typeof resolveAuthSession>> }).authSession =
    await resolveAuthSession(event)
})
