import type { Classroom } from '@ieb/shared'
import { describe, expect, it, vi } from 'vitest'
import { RegistrationStatusService } from '../../../server/modules/auth/application/registration-status.service'
import type { AuthClassroomRepository } from '../../../server/modules/auth/application/ports'

const buildClassroom = (overrides: Partial<Classroom> & Pick<Classroom, 'id' | 'name' | 'uuid'>): Classroom => ({
  id: overrides.id,
  name: overrides.name,
  uuid: overrides.uuid,
  description: overrides.description || 'Descricao',
  registrationOpen: overrides.registrationOpen ?? true,
  registrationStartsAt: overrides.registrationStartsAt || null,
  registrationEndsAt: overrides.registrationEndsAt || null,
  linkedCourseIds: overrides.linkedCourseIds || [],
  createdAt: overrides.createdAt || '2026-05-08T00:00:00.000Z',
  updatedAt: overrides.updatedAt || '2026-05-08T00:00:00.000Z',
  deletedAt: overrides.deletedAt || null,
  createdBy: overrides.createdBy || null,
  updatedBy: overrides.updatedBy || null,
  deletedBy: overrides.deletedBy || null
})

describe('registration status service', () => {
  it('returns an open status when the classroom registration window is available', async () => {
    const classroomRepository: AuthClassroomRepository = {
      findByUuid: vi.fn(async () => buildClassroom({ id: 'class-1', name: 'Turma 2026', uuid: 'class-1' }))
    }
    const service = new RegistrationStatusService({ classroomRepository })

    const response = await service.getRegistrationStatus('class-1')

    expect(response).toEqual({
      isOpen: true,
      message: 'Cadastro liberado para esta turma.',
      classroomName: 'Turma 2026'
    })
  })
})
