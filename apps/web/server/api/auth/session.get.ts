import type { AuthSessionResponse } from '@ieb/shared'

export default defineEventHandler(async (event): Promise<AuthSessionResponse> => {
  const session = (event.context as { authSession?: { user: AuthSessionResponse['user'] } }).authSession

  return {
    authenticated: Boolean(session?.user),
    user: session?.user || null
  }
})
