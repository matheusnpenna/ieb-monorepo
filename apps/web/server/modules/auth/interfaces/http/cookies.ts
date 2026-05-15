import { deleteCookie, getCookie, getHeader, getRequestProtocol, setCookie, type H3Event } from 'h3'
import { getAuthModule } from '../../auth.module'

interface SessionRuntimeConfig {
  session: {
    cookieName: string
    cookieMaxAge: number
  }
}

const getSessionConfig = () => useRuntimeConfig() as unknown as SessionRuntimeConfig

const isSecureCookieRequest = (event: H3Event) => {
  const forwardedProto = getHeader(event, 'x-forwarded-proto')
  const protocol = getRequestProtocol(event)

  return process.env.NODE_ENV === 'production' || forwardedProto === 'https' || protocol === 'https'
}

export const setAuthSessionCookieForEvent = async (event: H3Event, idToken: string) => {
  const config = getSessionConfig()
  const expiresIn = config.session.cookieMaxAge * 1000
  const sessionCookie = await getAuthModule().sessionService.createSessionCookie(idToken, { expiresIn })

  setCookie(event, config.session.cookieName, sessionCookie, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureCookieRequest(event),
    path: '/',
    maxAge: config.session.cookieMaxAge
  })
}

export const clearAuthSessionCookieForEvent = (event: H3Event) => {
  const config = getSessionConfig()

  deleteCookie(event, config.session.cookieName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureCookieRequest(event),
    path: '/'
  })
}

export const getAuthSessionCookieFromEvent = (event: H3Event) => {
  const config = getSessionConfig()

  return getCookie(event, config.session.cookieName)
}
