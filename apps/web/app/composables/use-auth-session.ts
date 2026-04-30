import type { AuthSessionResponse, AuthSessionUser } from '@ieb/shared'

let sessionRequest: Promise<AuthSessionResponse> | null = null

export const useAuthSession = () => {
  const user = useState<AuthSessionUser | null>('auth-user', () => null)
  const pending = useState<boolean>('auth-user-pending', () => false)
  const initialized = useState<boolean>('auth-user-initialized', () => false)

  const setUser = (nextUser: AuthSessionUser | null) => {
    user.value = nextUser
    initialized.value = true
  }

  const clearUser = () => {
    setUser(null)
  }

  const fetchSession = async (force = false) => {
    if (initialized.value && !force) {
      return user.value
    }

    if (!sessionRequest || force) {
      pending.value = true
      sessionRequest = $fetch<AuthSessionResponse>('/api/auth/session', {
        credentials: 'include'
      })
    }

    try {
      const response = await sessionRequest
      setUser(response.user)
      return response.user
    } catch {
      clearUser()
      return null
    } finally {
      pending.value = false
      sessionRequest = null
    }
  }

  return {
    user: readonly(user),
    pending: readonly(pending),
    initialized: readonly(initialized),
    setUser,
    clearUser,
    fetchSession
  }
}
