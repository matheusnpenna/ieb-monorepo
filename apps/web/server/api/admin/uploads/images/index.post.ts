import type { AdminUploadedImageResponse } from '@ieb/shared'
import { createError, defineEventHandler, readMultipartFormData, setResponseStatus } from 'h3'
import { requireAuthSession } from '../../../../utils/auth'
import { uploadAdminCourseImage } from '../../../../utils/admin-assets'

export default defineEventHandler(async (event): Promise<AdminUploadedImageResponse> => {
  try {
    const session = await requireAuthSession(event, { admin: true })
    const multipartParts = await readMultipartFormData(event)
    const fieldPart = multipartParts?.find((part) => part.name === 'field')
    const filePart = multipartParts?.find((part) => part.name === 'file')
    const fieldValue = fieldPart?.data ? Buffer.from(fieldPart.data).toString('utf-8').trim() : ''

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

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
})
