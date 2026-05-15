import type { IdentityProvider } from '../application/ports'
import { createAuthError } from '../domain/errors'
import { getFirebaseAdminAuth } from '../../shared/infrastructure/firebase-admin'

interface SessionRuntimeConfig {
  firebase: {
    apiKey: string
  }
}

interface FirebaseSignInResponse {
  idToken: string
  localId: string
  email: string
}

interface FirebaseIdentityToolkitError {
  error?: {
    message?: string
  }
}

const getSessionConfig = () => useRuntimeConfig() as unknown as SessionRuntimeConfig

const buildIdentityToolkitUrl = (path: string) => {
  const config = getSessionConfig()

  if (!config.firebase.apiKey) {
    throw createAuthError(500, 'NUXT_FIREBASE_API_KEY nao foi configurada.')
  }

  return `https://identitytoolkit.googleapis.com/v1/${path}?key=${config.firebase.apiKey}`
}

const callIdentityToolkit = async <TResponse>(path: string, body: Record<string, unknown>) => {
  try {
    return await $fetch<TResponse>(buildIdentityToolkitUrl(path), {
      method: 'POST',
      body
    })
  } catch (error) {
    const firebaseError = error as { data?: FirebaseIdentityToolkitError; message?: string }
    const code = firebaseError?.data?.error?.message || firebaseError?.message

    throw {
      code
    }
  }
}

export class FirebaseIdentityProvider implements IdentityProvider {
  async signInWithEmailAndPassword(input: { email: string; password: string }) {
    const response = await callIdentityToolkit<FirebaseSignInResponse>('accounts:signInWithPassword', {
      email: input.email,
      password: input.password,
      returnSecureToken: true
    })

    return {
      idToken: response.idToken,
      uid: response.localId,
      email: response.email
    }
  }

  async signUpWithEmailAndPassword(input: { email: string; password: string }) {
    const response = await callIdentityToolkit<FirebaseSignInResponse>('accounts:signUp', {
      email: input.email,
      password: input.password,
      returnSecureToken: true
    })

    return {
      idToken: response.idToken,
      uid: response.localId,
      email: response.email
    }
  }

  async sendPasswordRecoveryEmail(email: string) {
    await callIdentityToolkit('accounts:sendOobCode', {
      requestType: 'PASSWORD_RESET',
      email
    })
  }

  async createSessionCookie(idToken: string, options: { expiresIn: number }) {
    return await getFirebaseAdminAuth().createSessionCookie(idToken, options)
  }

  async verifySessionCookie(sessionCookie: string) {
    const decodedSession = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true)

    return {
      uid: decodedSession.uid,
      email: typeof decodedSession.email === 'string' ? decodedSession.email : undefined
    }
  }

  async getUser(uid: string) {
    const authRecord = await getFirebaseAdminAuth().getUser(uid)

    return {
      uid: authRecord.uid,
      email: authRecord.email,
      displayName: authRecord.displayName
    }
  }

  async deleteUser(uid: string) {
    await getFirebaseAdminAuth().deleteUser(uid)
  }
}
