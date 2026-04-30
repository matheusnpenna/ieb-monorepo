import { useAuthSession } from '../composables/use-auth-session'

const PUBLIC_ROUTES = new Set(['/', '/login', '/cadastro', '/recurperar-senha'])
const AUTH_SCREEN_ROUTES = new Set(['/login', '/cadastro', '/recurperar-senha'])

export default defineNuxtRouteMiddleware(async (to) => {
  const { user, fetchSession } = useAuthSession()
  const isPublicRoute = PUBLIC_ROUTES.has(to.path)

  if (!isPublicRoute || AUTH_SCREEN_ROUTES.has(to.path)) {
    await fetchSession()
  }

  if (AUTH_SCREEN_ROUTES.has(to.path) && user.value) {
    return navigateTo('/home')
  }

  if (isPublicRoute) {
    return
  }

  if (!user.value) {
    return navigateTo({
      path: '/login',
      query: {
        redirect: to.fullPath
      }
    })
  }

  if (to.path.startsWith('/admin') && user.value.role !== 'admin') {
    return navigateTo('/home')
  }
})
