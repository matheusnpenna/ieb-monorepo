import { extname } from 'node:path'
import { createAssetError } from './errors'

export type AdminImageField = 'cover' | 'hero' | 'avatar'
export type AdminLessonFileKind = 'audio' | 'pdf'

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'])
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
const AUDIO_MIME_TYPES = new Set([
  'audio/aac',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'audio/x-m4a',
  'audio/x-wav'
])
const PDF_MIME_TYPES = new Set(['application/pdf'])
const MAX_AUDIO_SIZE_BYTES = 50 * 1024 * 1024
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024

export const isAdminImageField = (value: string): value is AdminImageField =>
  value === 'cover' || value === 'hero' || value === 'avatar'

export const isAdminLessonFileKind = (value: string): value is AdminLessonFileKind =>
  value === 'audio' || value === 'pdf'

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

export const assertAdminLessonFileUploadInput = (input: {
  kind: AdminLessonFileKind
  filename: string
  mimeType: string
  data: Uint8Array
}) => {
  if (!input.filename.trim()) {
    throw createAssetError(400, 'Selecione um arquivo valido para envio.')
  }

  if (input.kind === 'audio' && !AUDIO_MIME_TYPES.has(input.mimeType)) {
    throw createAssetError(400, 'Envie um arquivo de audio valido.')
  }

  if (input.kind === 'pdf' && !PDF_MIME_TYPES.has(input.mimeType)) {
    throw createAssetError(400, 'Envie um arquivo PDF valido.')
  }

  const maxSize = input.kind === 'audio' ? MAX_AUDIO_SIZE_BYTES : MAX_PDF_SIZE_BYTES
  const formattedMaxSize = input.kind === 'audio' ? '50 MB' : '10 MB'

  if (input.data.byteLength === 0 || input.data.byteLength > maxSize) {
    throw createAssetError(400, `O arquivo precisa ter ate ${formattedMaxSize}.`)
  }
}

export const getImageExtension = (filename: string) => extname(filename) || '.bin'

export const getAdminImageAssetDirectory = (field: AdminImageField) =>
  field === 'avatar' ? 'users/avatar' : `courses/${field}`

export const getAdminImageTargetCollection = (field: AdminImageField) =>
  field === 'avatar' ? 'users' : 'courses'

export const getAdminImageFieldLabel = (field: AdminImageField) =>
  field === 'cover' ? 'capa' : field === 'hero' ? 'hero' : 'avatar'

export const getAdminLessonFileAssetDirectory = (kind: AdminLessonFileKind) => `lessons/${kind}`

export const getAdminLessonFileFieldLabel = (kind: AdminLessonFileKind) =>
  kind === 'audio' ? 'audio' : 'PDF'
