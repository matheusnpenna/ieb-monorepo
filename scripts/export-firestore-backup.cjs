#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { createRequire } = require('module')

const repoRoot = path.resolve(__dirname, '..')
const workspaceRequire = createRequire(path.join(repoRoot, 'apps', 'web', 'package.json'))
const { initializeApp, cert, getApps } = workspaceRequire('firebase-admin/app')
const { getFirestore, Timestamp, GeoPoint, DocumentReference } = workspaceRequire('firebase-admin/firestore')
const envPath = path.join(repoRoot, '.env')
const defaultOutputPath = path.join(
  repoRoot,
  'data',
  'firestore',
  'instituto-eurico-bergsten-legacy-export-2026-04-30.json'
)

const loadEnvFile = (filePath) => {
  const envText = fs.readFileSync(filePath, 'utf8')
  const env = {}

  for (const rawLine of envText.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const separatorIndex = rawLine.indexOf('=')
    if (separatorIndex === -1) continue

    const key = rawLine.slice(0, separatorIndex).trim()
    let value = rawLine.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    env[key] = value
  }

  return env
}

const slugifyKeyOrder = (collections) => collections.sort((left, right) => left.id.localeCompare(right.id))

const serializeValue = (value) => {
  if (value === null || value === undefined) {
    return value ?? null
  }

  if (value instanceof Timestamp) {
    return {
      __type: 'timestamp',
      iso: value.toDate().toISOString()
    }
  }

  if (value instanceof Date) {
    return {
      __type: 'date',
      iso: value.toISOString()
    }
  }

  if (value instanceof GeoPoint) {
    return {
      __type: 'geopoint',
      latitude: value.latitude,
      longitude: value.longitude
    }
  }

  if (value instanceof DocumentReference) {
    return {
      __type: 'documentReference',
      path: value.path
    }
  }

  if (Buffer.isBuffer(value)) {
    return {
      __type: 'buffer',
      base64: value.toString('base64')
    }
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue)
  }

  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nestedValue]) => [key, serializeValue(nestedValue)]))
  }

  return value
}

const exportDocument = async (documentSnapshot) => {
  const subcollections = await documentSnapshot.ref.listCollections()
  slugifyKeyOrder(subcollections)

  return {
    id: documentSnapshot.id,
    path: documentSnapshot.ref.path,
    data: serializeValue(documentSnapshot.data()),
    subcollections: await Promise.all(subcollections.map(exportCollection))
  }
}

const exportCollection = async (collectionReference) => {
  const snapshot = await collectionReference.get()
  const documents = snapshot.docs.sort((left, right) => left.id.localeCompare(right.id))

  return {
    name: collectionReference.id,
    path: collectionReference.path,
    documentCount: documents.length,
    documents: await Promise.all(documents.map(exportDocument))
  }
}

const main = async () => {
  if (!fs.existsSync(envPath)) {
    throw new Error(`Arquivo .env não encontrado em ${envPath}`)
  }

  const env = loadEnvFile(envPath)
  const app =
    getApps()[0] ||
    initializeApp({
      credential: cert({
        projectId: env.NUXT_FIREBASE_PROJECT_ID,
        clientEmail: env.NUXT_FIREBASE_CLIENT_EMAIL,
        privateKey: env.NUXT_FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      })
    })

  const db = getFirestore(app)
  const topLevelCollections = await db.listCollections()
  slugifyKeyOrder(topLevelCollections)

  const exportPayload = {
    projectId: env.NUXT_FIREBASE_PROJECT_ID,
    exportedAt: new Date().toISOString(),
    collectionCount: topLevelCollections.length,
    collections: await Promise.all(topLevelCollections.map(exportCollection))
  }

  const outputPath = path.resolve(process.argv[2] || defaultOutputPath)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, JSON.stringify(exportPayload, null, 2) + '\n', 'utf8')

  process.stdout.write(
    JSON.stringify(
      {
        outputPath,
        projectId: exportPayload.projectId,
        collectionCount: exportPayload.collectionCount
      },
      null,
      2
    ) + '\n'
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
