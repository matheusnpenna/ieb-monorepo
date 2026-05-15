import type { AdminUploadedImageResponse, AuthSessionContext } from '@ieb/shared'
import { createError, readMultipartFormData, setResponseStatus, type H3Event } from 'h3'
import { requireAuthSession } from '../../../../utils/auth'
import { getAssetsModule } from '../../assets.module'
import { isAdminImageField } from '../../domain/validation'

const getErrorStatusCode = (error: unknown) =>
  typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number'
    ? error.statusCode
    : 500

const getErrorStatusMessage = (error: unknown, fallbackMessage: string) =>
  typeof error === 'object' &&
  error !== null &&
  'statusMessage' in error &&
  typeof error.statusMessage === 'string' &&
  error.statusMessage
    ? error.statusMessage
    : fallbackMessage

const writeFailureLog = async (
  session: AuthSessionContext | null,
  input: {
    fieldValue: string
    statusCode: number
    statusMessage: string
  }
) => {
  if (!session) {
    return
  }

  const targetCollection = input.fieldValue === 'avatar' ? 'users' : 'courses'
  const summary =
    input.fieldValue === 'avatar'
      ? 'Falha ao enviar imagem administrativa para usuario.'
      : 'Falha ao enviar imagem administrativa para curso.'

  try {
    await getAssetsModule().adminLog.write(session, {
      action: 'update',
      targetCollection,
      targetId: input.fieldValue || 'image-upload',
      summary,
      metadata: {
        field: input.fieldValue || null,
        statusCode: input.statusCode,
        statusMessage: input.statusMessage
      }
    })
  } catch {
    // Preserve the original upload error even if admin log persistence fails.
  }
}

export const handleUploadAdminImage = async (event: H3Event): Promise<AdminUploadedImageResponse> => {
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

    if (!isAdminImageField(fieldValue)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Informe um campo de imagem valido.'
      })
    }

    const uploadedImage = await getAssetsModule().service.uploadAdminImage(session, {
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
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel enviar a imagem.')

    await writeFailureLog(session, {
      fieldValue,
      statusCode,
      statusMessage
    })

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
}
