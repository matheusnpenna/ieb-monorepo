import type {
  AccountAvatarUploadResponse,
  AdminUploadedImageResponse,
  AdminUploadedLessonFileResponse,
  AuthSessionContext
} from '@ieb/shared'
import { createError, readMultipartFormData, setResponseStatus, type H3Event } from 'h3'
import { requireAuthSession } from '../../../auth/interfaces/http/session'
import { getAssetsModule } from '../../assets.module'
import { isAdminImageField, isAdminLessonFileKind } from '../../domain/validation'

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

const writeAccountAvatarFailureLog = async (
  session: AuthSessionContext | null,
  input: {
    statusCode: number
    statusMessage: string
  }
) => {
  if (!session) {
    return
  }

  try {
    await getAssetsModule().adminLog.write(session, {
      action: 'update',
      targetCollection: 'users',
      targetId: session.user.id,
      summary: 'Falha ao enviar avatar da propria conta.',
      metadata: {
        statusCode: input.statusCode,
        statusMessage: input.statusMessage
      }
    })
  } catch {
    // Preserve the original upload error even if log persistence fails.
  }
}

const writeAdminLessonFileFailureLog = async (
  session: AuthSessionContext | null,
  input: {
    kindValue: string
    statusCode: number
    statusMessage: string
  }
) => {
  if (!session) {
    return
  }

  try {
    await getAssetsModule().adminLog.write(session, {
      action: 'update',
      targetCollection: 'lessons',
      targetId: input.kindValue || 'lesson-file-upload',
      summary: 'Falha ao enviar arquivo administrativo para aula.',
      metadata: {
        kind: input.kindValue || null,
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

export const handleUploadAccountAvatar = async (event: H3Event): Promise<AccountAvatarUploadResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event)
    const multipartParts = await readMultipartFormData(event)
    const filePart = multipartParts?.find((part) => part.name === 'file')

    if (!filePart?.filename || !filePart.type || !filePart.data) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Selecione uma imagem valida para envio.'
      })
    }

    const uploadedImage = await getAssetsModule().service.uploadAccountAvatar(session, {
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
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel enviar o avatar.')

    await writeAccountAvatarFailureLog(session, {
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

export const handleUploadAdminLessonFile = async (event: H3Event): Promise<AdminUploadedLessonFileResponse> => {
  let session: AuthSessionContext | null = null
  let kindValue = ''

  try {
    session = await requireAuthSession(event, { admin: true })
    const multipartParts = await readMultipartFormData(event)
    const kindPart = multipartParts?.find((part) => part.name === 'kind')
    const filePart = multipartParts?.find((part) => part.name === 'file')
    kindValue = kindPart?.data ? Buffer.from(kindPart.data).toString('utf-8').trim() : ''

    if (!filePart?.filename || !filePart.type || !filePart.data) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Selecione um arquivo valido para envio.'
      })
    }

    if (!isAdminLessonFileKind(kindValue)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Informe um tipo de arquivo valido para a aula.'
      })
    }

    const uploadedFile = await getAssetsModule().service.uploadAdminLessonFile(session, {
      kind: kindValue,
      filename: filePart.filename,
      mimeType: filePart.type,
      data: filePart.data
    })

    return {
      status: 'success',
      data: uploadedFile
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel enviar o arquivo da aula.')

    await writeAdminLessonFileFailureLog(session, {
      kindValue,
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
