import type { RegistrationStatusResponse } from '@ieb/shared'
import type { AuthClassroomRepository } from './ports'
import { REGISTRATION_CLOSED_MESSAGE, isRegistrationWindowOpen } from '../domain/validation'

interface RegistrationStatusServiceDependencies {
  classroomRepository: AuthClassroomRepository
}

export class RegistrationStatusService {
  private readonly classroomRepository: AuthClassroomRepository

  constructor(dependencies: RegistrationStatusServiceDependencies) {
    this.classroomRepository = dependencies.classroomRepository
  }

  async getRegistrationStatus(classroomUuid: string): Promise<RegistrationStatusResponse> {
    if (!classroomUuid) {
      return {
        isOpen: false,
        message: REGISTRATION_CLOSED_MESSAGE,
        classroomName: null
      }
    }

    const classroom = await this.classroomRepository.findByUuid(classroomUuid)

    if (!classroom || !isRegistrationWindowOpen(classroom)) {
      return {
        isOpen: false,
        message: REGISTRATION_CLOSED_MESSAGE,
        classroomName: classroom?.name || null
      }
    }

    return {
      isOpen: true,
      message: 'Cadastro liberado para esta turma.',
      classroomName: classroom.name
    }
  }
}
