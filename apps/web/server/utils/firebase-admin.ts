import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

interface FirebaseAdminRuntimeConfig {
  firebase: {
    projectId: string
    clientEmail: string
    privateKey: string
    storageBucket: string
    databaseUrl: string
  }
}

export const getFirebaseAdminApp = () => {
  if (getApps().length > 0) {
    return getApps()[0]!
  }

  const config = useRuntimeConfig() as unknown as FirebaseAdminRuntimeConfig

  return initializeApp({
    credential: cert({
      projectId: config.firebase.projectId,
      clientEmail: config.firebase.clientEmail,
      privateKey: config.firebase.privateKey.replace(/\\n/g, '\n')
    }),
    storageBucket: config.firebase.storageBucket,
    databaseURL: config.firebase.databaseUrl
  })
}

export const getFirebaseAdminAuth = () => getAuth(getFirebaseAdminApp())
export const getFirebaseAdminFirestore = () => getFirestore(getFirebaseAdminApp())
