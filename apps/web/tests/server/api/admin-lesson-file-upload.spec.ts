import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requireAuthSession, uploadAdminLessonFile, readMultipartFormData, writeAdminLog } = vi.hoisted(() => ({
  requireAuthSession: vi.fn(),
  uploadAdminLessonFile: vi.fn(),
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
      uploadAdminLessonFile
    }
  })
}))

import uploadLessonFileHandler from '../../../server/api/admin/uploads/lesson-files/index.post'

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

describe('POST /api/admin/uploads/lesson-files', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uploads an admin lesson file and returns the public url', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    readMultipartFormData.mockResolvedValue([
      {
        name: 'kind',
        data: Buffer.from('pdf')
      },
      {
        name: 'file',
        filename: 'apostila.pdf',
        type: 'application/pdf',
        data: Buffer.from('pdf-binary')
      }
    ])
    uploadAdminLessonFile.mockResolvedValue({
      url: 'https://storage.googleapis.com/bucket/admin/lessons/pdf/file.pdf',
      path: 'admin/lessons/pdf/file.pdf',
      filename: 'apostila.pdf'
    })

    const response = await uploadLessonFileHandler({} as never)

    expect(requireAuthSession).toHaveBeenCalledWith(expect.anything(), { admin: true })
    expect(uploadAdminLessonFile).toHaveBeenCalledWith(
      sampleSession,
      expect.objectContaining({
        kind: 'pdf',
        filename: 'apostila.pdf',
        mimeType: 'application/pdf'
      })
    )
    expect(response).toEqual({
      status: 'success',
      data: {
        url: 'https://storage.googleapis.com/bucket/admin/lessons/pdf/file.pdf',
        path: 'admin/lessons/pdf/file.pdf',
        filename: 'apostila.pdf'
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

    const response = await uploadLessonFileHandler(event)

    expect(event.node.res.statusCode).toBe(400)
    expect(writeAdminLog).toHaveBeenCalledWith(
      sampleSession,
      expect.objectContaining({
        action: 'update',
        targetCollection: 'lessons',
        summary: 'Falha ao enviar arquivo administrativo para aula.'
      })
    )
    expect(response).toEqual({
      status: 'error',
      messages: ['Selecione um arquivo valido para envio.'],
      data: null
    })
  })
})
