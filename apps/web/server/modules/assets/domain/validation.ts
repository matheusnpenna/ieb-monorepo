import { extname } from 'node:path'
import { createAssetError } from './errors'

export type AdminImageField = 'cover' | 'hero' | 'avatar'

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'])
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024

export const isAdminImageField = (value: string): value is AdminImageField =>
  value === 'cover' || value === 'hero' || value === 'avatar'

export const sanitizeFilename = (filename: string) =>
  filename
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')

export const assertAdminImageUploadInput = (input: {
  filename: string
  mimeType: string
  data: Uint8Array
}) => {
  if (!input.filename.trim()) {
    throw createAssetError(400, 'Selecione uma imagem valida para envio.')
  }

  if (!IMAGE_MIME_TYPES.has(input.mimeType)) {
    throw createAssetError(400, 'Envie uma imagem JPG, PNG, WEBP, SVG ou GIF.')
  }

  if (input.data.byteLength === 0 || input.data.byteLength > MAX_IMAGE_SIZE_BYTES) {
    throw createAssetError(400, 'A imagem precisa ter ate 10 MB.')
  }
}

export const getImageExtension = (filename: string) => extname(filename) || '.bin'

export const getAdminImageAssetDirectory = (field: AdminImageField) =>
  field === 'avatar' ? 'users/avatar' : `courses/${field}`

export const getAdminImageTargetCollection = (field: AdminImageField) =>
  field === 'avatar' ? 'users' : 'courses'

export const getAdminImageFieldLabel = (field: AdminImageField) =>
  field === 'cover' ? 'capa' : field === 'hero' ? 'hero' : 'avatar'
