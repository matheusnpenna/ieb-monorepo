import type { FirestoreCollections } from '@ieb/shared'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

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
export const getFirebaseAdminStorage = () => getStorage(getFirebaseAdminApp())
export const getFirebaseAdminBucket = () => getFirebaseAdminStorage().bucket()

const FIRESTORE_COLLECTION_PREFIX = 'v2_' as const

export const getFirestoreCollectionName = (collectionName: FirestoreCollections) =>
  `${FIRESTORE_COLLECTION_PREFIX}${collectionName}` as const

export const getFirebaseAdminCollection = (
  collectionName: FirestoreCollections,
  firestore: Firestore = getFirebaseAdminFirestore()
) => firestore.collection(getFirestoreCollectionName(collectionName))
