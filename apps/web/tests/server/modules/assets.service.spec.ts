import type { AuthSessionContext } from '@ieb/shared'
import { describe, expect, it, vi } from 'vitest'
import { AssetsService } from '../../../server/modules/assets/application/assets.service'
import type { AdminLogPort, AssetStorage } from '../../../server/modules/assets/application/ports'

const adminSession: AuthSessionContext = {
  user: {
    id: 'admin-1',
    email: 'admin@example.com',
    fullName: 'Admin User',
    role: 'admin',
    status: 'active',
    region: 'feira-de-santana',
    avatarUrl: null
  },
  issuedAt: '2026-05-08T00:00:00.000Z'
}

const buildService = () => {
  const storage: AssetStorage = {
    savePublicObject: vi.fn(async () => ({
      bucketName: 'bucket'
    }))
  }
  const adminLog: AdminLogPort = {
    write: vi.fn()
  }
  const service = new AssetsService({
    storage,
    adminLog,
    clock: {
      today: () => '2026-05-08'
    },
    idGenerator: {
      create: () => 'asset-1'
    }
  })

  return {
    adminLog,
    service,
    storage
  }
}

describe('assets service', () => {
  it('uploads an admin image through storage and log ports', async () => {
    const { adminLog, service, storage } = buildService()

    const uploadedImage = await service.uploadAdminImage(adminSession, {
      field: 'cover',
      filename: ' Capa Principal.PNG ',
      mimeType: 'image/png',
      data: Buffer.from('image')
    })

    expect(uploadedImage).toEqual({
      url: 'https://storage.googleapis.com/bucket/admin/courses/cover/2026-05-08/asset-1.png',
      path: 'admin/courses/cover/2026-05-08/asset-1.png',
      filename: 'capa-principal.png'
    })
    expect(storage.savePublicObject).toHaveBeenCalledWith(
      expect.objectContaining({
        objectPath: uploadedImage.path,
        contentType: 'image/png'
      })
    )
    expect(adminLog.write).toHaveBeenCalledWith(
      adminSession,
      expect.objectContaining({
        targetCollection: 'courses',
        targetId: uploadedImage.path
      })
    )
  })

  it('uploads an admin lesson file through storage and log ports', async () => {
    const { adminLog, service, storage } = buildService()

    const uploadedFile = await service.uploadAdminLessonFile(adminSession, {
      kind: 'pdf',
      filename: ' Apostila Aula 1.PDF ',
      mimeType: 'application/pdf',
      data: Buffer.from('pdf')
    })

    expect(uploadedFile).toEqual({
      url: 'https://storage.googleapis.com/bucket/admin/lessons/pdf/2026-05-08/asset-1.pdf',
      path: 'admin/lessons/pdf/2026-05-08/asset-1.pdf',
      filename: 'apostila-aula-1.pdf'
    })
    expect(storage.savePublicObject).toHaveBeenCalledWith(
      expect.objectContaining({
        objectPath: uploadedFile.path,
        contentType: 'application/pdf'
      })
    )
    expect(adminLog.write).toHaveBeenCalledWith(
      adminSession,
      expect.objectContaining({
        targetCollection: 'lessons',
        targetId: uploadedFile.path
      })
    )
  })
})
