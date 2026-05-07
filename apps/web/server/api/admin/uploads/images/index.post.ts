import type { AdminUploadedImageResponse, AuthSessionContext } from '@ieb/shared'
import { createError, defineEventHandler, readMultipartFormData, setResponseStatus } from 'h3'
import { requireAuthSession, writeAdminLog } from '../../../../utils/auth'
import { uploadAdminCourseImage } from '../../../../utils/admin-assets'

export default defineEventHandler(async (event): Promise<AdminUploadedImageResponse> => {
  let session: AuthSessionContext | null = null
  let fieldValue = ''

  try {
    session = await requireAuthSession(event, { admin: true })
    const multipartParts = await readMultipartFormData(event)
    const fieldPart = multipartParts?.find((part) => part.name === 'field')
    const filePart = multipartParts?.find((part) => part.name === 'file')
    fieldValue = fieldPart?.data ? Buffer.from(fieldPart.data).toString('utf-8').trim() : ''

    if (!filePart?.filename || !filePart.type || !filePart.data) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Selecione uma imagem valida para envio.'
      })
    }

    if (fieldValue !== 'cover' && fieldValue !== 'hero') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Informe um campo de imagem valido.'
      })
    }

    const uploadedImage = await uploadAdminCourseImage(session, {
      field: fieldValue,
      filename: filePart.filename,
      mimeType: filePart.type,
      data: filePart.data
    })

    return {
      status: 'success',
      data: uploadedImage
    }
  } catch (error) {
    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number'
        ? error.statusCode
        : 500
    const statusMessage =
      typeof error === 'object' &&
      error !== null &&
      'statusMessage' in error &&
      typeof error.statusMessage === 'string' &&
      error.statusMessage
        ? error.statusMessage
        : 'Nao foi possivel enviar a imagem.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'update',
          targetCollection: 'courses',
          targetId: fieldValue || 'image-upload',
          summary: 'Falha ao enviar imagem administrativa para curso.',
          metadata: {
            field: fieldValue || null,
            statusCode,
            statusMessage
          }
        })
      } catch {
        // Preserve the original upload error even if admin log persistence fails.
      }
    }

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
})
