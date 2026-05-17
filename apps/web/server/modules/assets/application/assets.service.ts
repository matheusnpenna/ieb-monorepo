import type { AuthSessionContext } from '@ieb/shared'
import type { AdminImageField, AdminLessonFileKind } from '../domain/validation'
import {
  assertAdminLessonFileUploadInput,
  assertAdminImageUploadInput,
  getAdminImageAssetDirectory,
  getAdminImageFieldLabel,
  getAdminImageTargetCollection,
  getAdminLessonFileAssetDirectory,
  getAdminLessonFileFieldLabel,
  getImageExtension,
  sanitizeFilename
} from '../domain/validation'
import { createAssetError } from '../domain/errors'
import type { AdminLogPort, AssetClock, AssetIdGenerator, AssetStorage } from './ports'

export interface UploadAdminImageInput {
  field: AdminImageField
  filename: string
  mimeType: string
  data: Uint8Array
}

export interface UploadAccountAvatarInput {
  filename: string
  mimeType: string
  data: Uint8Array
}

export interface UploadAdminLessonFileInput {
  kind: AdminLessonFileKind
  filename: string
  mimeType: string
  data: Uint8Array
}

interface AssetsServiceDependencies {
  storage: AssetStorage
  adminLog: AdminLogPort
  clock: AssetClock
  idGenerator: AssetIdGenerator
}

export class AssetsService {
  private readonly storage: AssetStorage
  private readonly adminLog: AdminLogPort
  private readonly clock: AssetClock
  private readonly idGenerator: AssetIdGenerator

  constructor(dependencies: AssetsServiceDependencies) {
    this.storage = dependencies.storage
    this.adminLog = dependencies.adminLog
    this.clock = dependencies.clock
    this.idGenerator = dependencies.idGenerator
  }

  async uploadAdminImage(session: AuthSessionContext, input: UploadAdminImageInput) {
    this.assertAdminSession(session)
    assertAdminImageUploadInput(input)

    const safeFilename = sanitizeFilename(input.filename)
    const extension = getImageExtension(safeFilename)
    const objectPath = `admin/${getAdminImageAssetDirectory(input.field)}/${this.clock.today()}/${this.idGenerator.create()}${extension}`
    const savedObject = await this.storage.savePublicObject({
      objectPath,
      data: input.data,
      contentType: input.mimeType,
      metadata: {
        uploadedBy: session.user.id,
        originalFilename: safeFilename
      }
    })
    const url = `https://storage.googleapis.com/${savedObject.bucketName}/${objectPath}`
    const targetCollection = getAdminImageTargetCollection(input.field)
    const fieldLabel = getAdminImageFieldLabel(input.field)

    await this.adminLog.write(session, {
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

  async uploadAccountAvatar(session: AuthSessionContext, input: UploadAccountAvatarInput) {
    assertAdminImageUploadInput(input)

    const safeFilename = sanitizeFilename(input.filename)
    const extension = getImageExtension(safeFilename)
    const objectPath = `account/users/avatar/${session.user.id}/${this.clock.today()}/${this.idGenerator.create()}${extension}`
    const savedObject = await this.storage.savePublicObject({
      objectPath,
      data: input.data,
      contentType: input.mimeType,
      metadata: {
        uploadedBy: session.user.id,
        originalFilename: safeFilename,
        usage: 'account-avatar'
      }
    })
    const url = `https://storage.googleapis.com/${savedObject.bucketName}/${objectPath}`

    return {
      url,
      path: objectPath,
      filename: safeFilename
    }
  }

  async uploadAdminLessonFile(session: AuthSessionContext, input: UploadAdminLessonFileInput) {
    this.assertAdminSession(session)
    assertAdminLessonFileUploadInput(input)

    const safeFilename = sanitizeFilename(input.filename)
    const extension = getImageExtension(safeFilename)
    const objectPath = `admin/${getAdminLessonFileAssetDirectory(input.kind)}/${this.clock.today()}/${this.idGenerator.create()}${extension}`
    const savedObject = await this.storage.savePublicObject({
      objectPath,
      data: input.data,
      contentType: input.mimeType,
      metadata: {
        uploadedBy: session.user.id,
        originalFilename: safeFilename,
        lessonFileKind: input.kind
      }
    })
    const url = `https://storage.googleapis.com/${savedObject.bucketName}/${objectPath}`
    const fieldLabel = getAdminLessonFileFieldLabel(input.kind)

    await this.adminLog.write(session, {
      action: 'update',
      targetCollection: 'lessons',
      targetId: objectPath,
      summary: `Arquivo de ${fieldLabel} enviado para o storage administrativo.`,
      metadata: {
        kind: input.kind,
        url
      }
    })

    return {
      url,
      path: objectPath,
      filename: safeFilename
    }
  }

  private assertAdminSession(session: AuthSessionContext) {
    if (session.user.role !== 'admin') {
      throw createAssetError(403, 'Acesso restrito ao painel administrativo.')
    }
  }
}
