import type { AuthSessionContext, Classroom, Course } from '@ieb/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClassroomsService } from '../../../server/modules/classrooms/application/classrooms.service'
import type {
  AdminLogPort,
  ClassroomClock,
  ClassroomCourseRepository,
  ClassroomIdGenerator,
  ClassroomRepository
} from '../../../server/modules/classrooms/application/ports'

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

const buildCourse = (overrides: Partial<Course> & Pick<Course, 'id' | 'title' | 'slug'>): Course => ({
  id: overrides.id,
  title: overrides.title,
  slug: overrides.slug,
  shortDescription: overrides.shortDescription || 'Resumo',
  description: overrides.description || 'Descricao',
  visibility: overrides.visibility || 'draft',
  coverImageUrl: overrides.coverImageUrl || null,
  heroImageUrl: overrides.heroImageUrl || null,
  totalDurationInMinutes: overrides.totalDurationInMinutes || 120,
  moduleIds: overrides.moduleIds || [],
  highlightIds: overrides.highlightIds || [],
  requiredCompletionRate: overrides.requiredCompletionRate || 80,
  certificateEnabled: overrides.certificateEnabled ?? true,
  createdAt: overrides.createdAt || '2026-05-08T00:00:00.000Z',
  updatedAt: overrides.updatedAt || '2026-05-08T00:00:00.000Z',
  deletedAt: overrides.deletedAt || null,
  createdBy: overrides.createdBy || 'admin-1',
  updatedBy: overrides.updatedBy || 'admin-1',
  deletedBy: overrides.deletedBy || null
})

const buildClassroom = (
  overrides: Partial<Classroom> & Pick<Classroom, 'id' | 'name' | 'uuid'>
): Classroom => ({
  id: overrides.id,
  name: overrides.name,
  uuid: overrides.uuid,
  description: overrides.description || 'Descricao da turma',
  registrationOpen: overrides.registrationOpen ?? true,
  registrationStartsAt: overrides.registrationStartsAt || '2026-05-08T10:00:00.000Z',
  registrationEndsAt: overrides.registrationEndsAt || '2026-05-30T22:00:00.000Z',
  linkedCourseIds: overrides.linkedCourseIds || ['curso-1'],
  createdAt: overrides.createdAt || '2026-05-08T00:00:00.000Z',
  updatedAt: overrides.updatedAt || '2026-05-08T00:00:00.000Z',
  deletedAt: overrides.deletedAt || null,
  createdBy: overrides.createdBy || 'admin-1',
  updatedBy: overrides.updatedBy || 'admin-1',
  deletedBy: overrides.deletedBy || null
})

const buildService = () => {
  const courses = new Map<string, Course>()
  const classrooms = new Map<string, Classroom>()
  const repository: ClassroomRepository = {
    listAll: vi.fn(async () => [...classrooms.values()]),
    findById: vi.fn(async (classroomId) => classrooms.get(classroomId) || null),
    findByUuid: vi.fn(async (classroomUuid) => (
      [...classrooms.values()].find((classroom) => classroom.uuid === classroomUuid && !classroom.deletedAt) || null
    )),
    save: vi.fn(async (classroom) => {
      classrooms.set(classroom.id, classroom)
    })
  }
  const courseRepository: ClassroomCourseRepository = {
    findById: vi.fn(async (courseId) => courses.get(courseId) || null),
    findBySlug: vi.fn(async (courseSlug) => (
      [...courses.values()].find((course) => course.slug === courseSlug && !course.deletedAt) || null
    ))
  }
  const adminLog: AdminLogPort = {
    write: vi.fn()
  }
  const clock: ClassroomClock = {
    now: () => '2026-05-08T12:00:00.000Z'
  }
  const idGenerator: ClassroomIdGenerator = {
    create: () => 'generated-classroom-id'
  }
  const service = new ClassroomsService({
    repository,
    courseRepository,
    adminLog,
    clock,
    idGenerator
  })

  return {
    adminLog,
    classrooms,
    courses,
    service
  }
}

describe('classrooms service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists admin classrooms sorted by name', async () => {
    const { classrooms, service } = buildService()

    classrooms.set('classroom-1', buildClassroom({ id: 'classroom-1', name: 'Turma B', uuid: 'classroom-1' }))
    classrooms.set('classroom-2', buildClassroom({ id: 'classroom-2', name: 'Turma A', uuid: 'classroom-2' }))

    const result = await service.listAdminClassroomsForManagement(adminSession)

    expect(result.map((classroom) => classroom.name)).toEqual(['Turma A', 'Turma B'])
  })

  it('creates, updates, loads and soft deletes a classroom', async () => {
    const { adminLog, classrooms, courses, service } = buildService()
    const course = buildCourse({
      id: 'curso-1',
      title: 'Curso de Teologia Basica',
      slug: 'curso-de-teologia-basica'
    })

    courses.set(course.id, course)

    const createdClassroom = await service.createAdminClassroom(adminSession, {
      name: 'Turma Principal 2026',
      uuid: '83b5fb4a-50ad-453e-a401-8deecf95804d',
      description: 'Turma principal do ano.',
      registrationOpen: true,
      registrationStartsAt: '2026-05-08T10:00:00.000Z',
      registrationEndsAt: '2026-05-30T22:00:00.000Z',
      linkedCourseIds: [course.id]
    })

    expect(createdClassroom.uuid).toBe('83b5fb4a-50ad-453e-a401-8deecf95804d')
    expect(classrooms.get(createdClassroom.id)?.linkedCourseIds).toEqual([course.id])

    const loadedClassroom = await service.getAdminClassroomByUuid(adminSession, createdClassroom.uuid)

    expect(loadedClassroom.name).toBe('Turma Principal 2026')

    const updatedClassroom = await service.updateAdminClassroomByUuid(adminSession, createdClassroom.uuid, {
      name: 'Turma Principal Revisada',
      uuid: createdClassroom.uuid,
      description: 'Turma revisada.',
      registrationOpen: false,
      registrationStartsAt: '2026-05-09T10:00:00.000Z',
      registrationEndsAt: '2026-05-31T22:00:00.000Z',
      linkedCourseIds: [course.slug]
    })

    expect(updatedClassroom.name).toBe('Turma Principal Revisada')
    expect(updatedClassroom.linkedCourseIds).toEqual([course.id])

    const deletedClassroom = await service.deleteAdminClassroomByUuid(adminSession, createdClassroom.uuid)

    expect(deletedClassroom.deletedAt).toBe('2026-05-08T12:00:00.000Z')
    expect(classrooms.get(createdClassroom.id)?.deletedAt).toBe('2026-05-08T12:00:00.000Z')
    expect(adminLog.write).toHaveBeenCalledTimes(3)
  })
})
