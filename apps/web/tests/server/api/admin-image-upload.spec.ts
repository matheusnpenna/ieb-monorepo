import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requireAuthSession, uploadAdminCourseImage, readMultipartFormData, writeAdminLog } = vi.hoisted(() => ({
  requireAuthSession: vi.fn(),
  uploadAdminCourseImage: vi.fn(),
  readMultipartFormData: vi.fn(),
  writeAdminLog: vi.fn()
}))

vi.hoisted(() => {
  ;(globalThis as typeof globalThis & { defineEventHandler?: unknown }).defineEventHandler = (handler: unknown) =>
    handler
})

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')

  return {
    ...actual,
    readMultipartFormData
  }
})

vi.mock('../../../server/modules/auth/interfaces/http/session', () => ({
  requireAuthSession,
  writeAdminLog
}))

vi.mock('../../../server/modules/assets/assets.module', () => ({
  getAssetsModule: () => ({
    adminLog: {
      write: writeAdminLog
    },
    service: {
      uploadAdminImage: uploadAdminCourseImage
    }
  })
}))

import uploadImageHandler from '../../../server/api/admin/uploads/images/index.post'

const sampleSession = {
  user: {
    id: 'admin-1',
    email: 'admin@example.com',
    fullName: 'Admin User',
    role: 'admin',
    status: 'active',
    region: 'feira-de-santana',
    avatarUrl: null
  },
  issuedAt: '2026-05-07T00:00:00.000Z'
} as const

describe('POST /api/admin/uploads/images', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uploads an admin image and returns the public url', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    readMultipartFormData.mockResolvedValue([
      {
        name: 'field',
        data: Buffer.from('cover')
      },
      {
        name: 'file',
        filename: 'capa.png',
        type: 'image/png',
        data: Buffer.from('image-binary')
      }
    ])
    uploadAdminCourseImage.mockResolvedValue({
      url: 'https://storage.googleapis.com/bucket/admin/courses/cover/file.png',
      path: 'admin/courses/cover/file.png',
      filename: 'capa.png'
    })

    const response = await uploadImageHandler({} as never)

    expect(requireAuthSession).toHaveBeenCalledWith(expect.anything(), { admin: true })
    expect(uploadAdminCourseImage).toHaveBeenCalledWith(
      sampleSession,
      expect.objectContaining({
        field: 'cover',
        filename: 'capa.png',
        mimeType: 'image/png'
      })
    )
    expect(response).toEqual({
      status: 'success',
      data: {
        url: 'https://storage.googleapis.com/bucket/admin/courses/cover/file.png',
        path: 'admin/courses/cover/file.png',
        filename: 'capa.png'
      }
    })
  })

  it('returns the standardized error payload when upload input is invalid', async () => {
    const event = {
      node: {
        res: {
          statusCode: 200
        }
      }
    } as never

    requireAuthSession.mockResolvedValue(sampleSession)
    readMultipartFormData.mockResolvedValue([])

    const response = await uploadImageHandler(event)

    expect(event.node.res.statusCode).toBe(400)
    expect(writeAdminLog).toHaveBeenCalledWith(
      sampleSession,
      expect.objectContaining({
        action: 'update',
        targetCollection: 'courses',
        summary: 'Falha ao enviar imagem administrativa para curso.'
      })
    )
    expect(response).toEqual({
      status: 'error',
      messages: ['Selecione uma imagem valida para envio.'],
      data: null
    })
  })
})
