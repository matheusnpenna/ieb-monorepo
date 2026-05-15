import type { AdminClassroomInput, AuthSessionContext, Classroom } from '@ieb/shared'
import type {
  AdminLogPort,
  ClassroomClock,
  ClassroomCourseRepository,
  ClassroomIdGenerator,
  ClassroomRepository
} from './ports'
import { createClassroomError } from '../domain/errors'
import {
  assertAdminClassroomPayload,
  isValidClassroomUuid,
  normalizeClassroomUuid,
  normalizeLinkedCourseIds
} from '../domain/validation'

interface ClassroomsServiceDependencies {
  repository: ClassroomRepository
  courseRepository: ClassroomCourseRepository
  adminLog: AdminLogPort
  clock: ClassroomClock
  idGenerator: ClassroomIdGenerator
}

export class ClassroomsService {
  private readonly repository: ClassroomRepository
  private readonly courseRepository: ClassroomCourseRepository
  private readonly adminLog: AdminLogPort
  private readonly clock: ClassroomClock
  private readonly idGenerator: ClassroomIdGenerator

  constructor(dependencies: ClassroomsServiceDependencies) {
    this.repository = dependencies.repository
    this.courseRepository = dependencies.courseRepository
    this.adminLog = dependencies.adminLog
    this.clock = dependencies.clock
    this.idGenerator = dependencies.idGenerator
  }

  async listAdminClassroomsForManagement(session: AuthSessionContext): Promise<Classroom[]> {
    this.assertAdminSession(session)

    return this.sortClassrooms((await this.repository.listAll()).filter((classroom) => !classroom.deletedAt))
  }

  async getAdminClassroomByUuid(session: AuthSessionContext, classroomUuid: string): Promise<Classroom> {
    this.assertAdminSession(session)

    const normalizedUuid = normalizeClassroomUuid(classroomUuid)

    if (!normalizedUuid) {
      throw createClassroomError(400, 'Informe um UUID valido para a turma.')
    }

    const classroom = await this.getClassroomByUuidInternal(normalizedUuid)

    if (!classroom || classroom.deletedAt) {
      throw createClassroomError(404, 'Turma nao encontrada.')
    }

    return classroom
  }

  async createAdminClassroom(session: AuthSessionContext, input: AdminClassroomInput): Promise<Classroom> {
    this.assertAdminSession(session)

    const resolvedUuid = await this.resolveUniqueAdminClassroomUuid(input.uuid)
    const payload = await this.buildClassroomPayload(input, { resolvedUuid })
    const createdClassroom: Classroom = {
      ...payload,
      id: payload.uuid,
      createdBy: session.user.id,
      updatedBy: session.user.id
    }

    await this.repository.save(createdClassroom)

    await this.adminLog.write(session, {
      action: 'create',
      targetCollection: 'classrooms',
      targetId: createdClassroom.id,
      summary: 'Criou uma nova turma no painel administrativo.',
      metadata: {
        uuid: createdClassroom.uuid,
        linkedCourseIds: createdClassroom.linkedCourseIds
      }
    })

    return createdClassroom
  }

  async updateAdminClassroomByUuid(
    session: AuthSessionContext,
    classroomUuid: string,
    input: AdminClassroomInput
  ): Promise<Classroom> {
    const existingClassroom = await this.getAdminClassroomByUuid(session, classroomUuid)
    const payload = await this.buildClassroomPayload(input, {
      existingClassroom,
      resolvedUuid: existingClassroom.uuid
    })
    const updatedClassroom: Classroom = {
      ...payload,
      id: existingClassroom.id,
      createdBy: existingClassroom.createdBy,
      updatedBy: session.user.id
    }

    await this.repository.save(updatedClassroom)

    await this.adminLog.write(session, {
      action: 'update',
      targetCollection: 'classrooms',
      targetId: updatedClassroom.id,
      summary: 'Atualizou uma turma do painel administrativo.',
      metadata: {
        uuid: updatedClassroom.uuid,
        linkedCourseIds: updatedClassroom.linkedCourseIds
      }
    })

    return updatedClassroom
  }

  async deleteAdminClassroomByUuid(session: AuthSessionContext, classroomUuid: string): Promise<Classroom> {
    const existingClassroom = await this.getAdminClassroomByUuid(session, classroomUuid)
    const timestamp = this.clock.now()
    const deletedClassroom: Classroom = {
      ...existingClassroom,
      deletedAt: timestamp,
      deletedBy: session.user.id,
      updatedAt: timestamp,
      updatedBy: session.user.id
    }

    await this.repository.save(deletedClassroom)

    await this.adminLog.write(session, {
      action: 'delete',
      targetCollection: 'classrooms',
      targetId: deletedClassroom.id,
      summary: 'Excluiu uma turma do painel administrativo.',
      metadata: {
        uuid: deletedClassroom.uuid
      }
    })

    return deletedClassroom
  }

  private async getClassroomByUuidInternal(classroomUuid: string) {
    const classroomById = await this.repository.findById(classroomUuid)

    if (classroomById) {
      return classroomById
    }

    return await this.repository.findByUuid(classroomUuid)
  }

  private async resolveLinkedCourseIds(linkedCourseIds: string[]) {
    const normalizedIds = normalizeLinkedCourseIds(linkedCourseIds)

    if (normalizedIds.length === 0) {
      throw createClassroomError(400, 'Selecione pelo menos um curso para vincular a turma.')
    }

    const resolvedCourses = await Promise.all(
      normalizedIds.map(async (courseId) => {
        const courseById = await this.courseRepository.findById(courseId)

        if (courseById && !courseById.deletedAt) {
          return courseById
        }

        const courseBySlug = await this.courseRepository.findBySlug(courseId)

        if (courseBySlug && !courseBySlug.deletedAt) {
          return courseBySlug
        }

        return null
      })
    )

    if (resolvedCourses.some((course) => !course)) {
      throw createClassroomError(400, 'Um ou mais cursos vinculados nao foram encontrados.')
    }

    return resolvedCourses.map((course) => course!.id)
  }

  private async resolveUniqueAdminClassroomUuid(inputUuid: string) {
    const normalizedRequestedUuid = normalizeClassroomUuid(inputUuid)
    const requestedUuid = normalizedRequestedUuid && isValidClassroomUuid(normalizedRequestedUuid)
      ? normalizedRequestedUuid
      : this.idGenerator.create()

    const existingRequestedClassroom = await this.repository.findById(requestedUuid)

    if (!existingRequestedClassroom) {
      return requestedUuid
    }

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const nextUuid = this.idGenerator.create()
      const existingClassroom = await this.repository.findById(nextUuid)

      if (!existingClassroom) {
        return nextUuid
      }
    }

    throw createClassroomError(500, 'Nao foi possivel gerar um UUID unico para a turma.')
  }

  private async buildClassroomPayload(
    input: AdminClassroomInput,
    options: {
      existingClassroom?: Classroom | null
      resolvedUuid?: string
    }
  ) {
    const existingClassroom = options.existingClassroom || null
    const normalizedPayload = assertAdminClassroomPayload(input, {
      currentClassroomUuid: existingClassroom?.uuid || null,
      resolvedUuid: options.resolvedUuid
    })
    const linkedCourseIds = await this.resolveLinkedCourseIds(input.linkedCourseIds)
    const timestamp = this.clock.now()

    return {
      name: input.name.trim(),
      uuid: normalizedPayload.uuid,
      description: input.description.trim(),
      registrationOpen: Boolean(input.registrationOpen),
      registrationStartsAt: normalizedPayload.registrationStartsAt,
      registrationEndsAt: normalizedPayload.registrationEndsAt,
      linkedCourseIds,
      createdAt: existingClassroom?.createdAt || timestamp,
      updatedAt: timestamp,
      deletedAt: null,
      createdBy: existingClassroom?.createdBy || null,
      updatedBy: null,
      deletedBy: null
    } satisfies Omit<Classroom, 'id'>
  }

  private assertAdminSession(session: AuthSessionContext) {
    if (session.user.role !== 'admin') {
      throw createClassroomError(403, 'Acesso restrito ao painel administrativo.')
    }
  }

  private sortClassrooms(classrooms: Classroom[]) {
    return [...classrooms].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
  }
}
