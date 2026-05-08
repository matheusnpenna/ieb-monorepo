import type { AuthSessionContext } from '@ieb/shared'
import { createError } from 'h3'
import { extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { writeAdminLog } from './auth'
import { getFirebaseAdminBucket } from './firebase-admin'

interface UploadAdminCourseImageInput {
  field: 'cover' | 'hero' | 'avatar'
  filename: string
  mimeType: string
  data: Uint8Array
}

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'])
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024

const createHttpError = (statusCode: number, statusMessage: string) =>
  createError({
    statusCode,
    statusMessage
  })

const sanitizeFilename = (filename: string) =>
  filename
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')

export const uploadAdminCourseImage = async (
  session: AuthSessionContext,
  input: UploadAdminCourseImageInput
) => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  if (!input.filename.trim()) {
    throw createHttpError(400, 'Selecione uma imagem valida para envio.')
  }

  if (!IMAGE_MIME_TYPES.has(input.mimeType)) {
    throw createHttpError(400, 'Envie uma imagem JPG, PNG, WEBP, SVG ou GIF.')
  }

  if (input.data.byteLength === 0 || input.data.byteLength > MAX_IMAGE_SIZE_BYTES) {
    throw createHttpError(400, 'A imagem precisa ter ate 10 MB.')
  }

  const bucket = getFirebaseAdminBucket()
  const safeFilename = sanitizeFilename(input.filename)
  const extension = extname(safeFilename) || '.bin'
  const assetDirectory = input.field === 'avatar' ? 'users/avatar' : `courses/${input.field}`
  const objectPath = `admin/${assetDirectory}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extension}`
  const file = bucket.file(objectPath)

  await file.save(Buffer.from(input.data), {
    metadata: {
      contentType: input.mimeType,
      metadata: {
        uploadedBy: session.user.id,
        originalFilename: safeFilename
      }
    }
  })
  await file.makePublic()

  const url = `https://storage.googleapis.com/${bucket.name}/${objectPath}`
  const targetCollection = input.field === 'avatar' ? 'users' : 'courses'
  const fieldLabel =
    input.field === 'cover' ? 'capa' : input.field === 'hero' ? 'hero' : 'avatar'

  await writeAdminLog(session, {
    action: 'update',
    targetCollection,
    targetId: objectPath,
    summary: `Imagem de ${fieldLabel} enviada para o storage administrativo.`,
    metadata: {
      field: input.field,
      url
    }
  })

  return {
    url,
    path: objectPath,
    filename: safeFilename
  }
}
