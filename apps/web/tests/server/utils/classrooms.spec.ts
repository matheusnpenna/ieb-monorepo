import type { Classroom, Course } from '@ieb/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getClassroomsModule } from '../../../server/modules/classrooms/classrooms.module'
import type { ClassroomsService } from '../../../server/modules/classrooms/application/classrooms.service'

const { getFirebaseAdminCollection, writeAdminLog } = vi.hoisted(() => ({
  getFirebaseAdminCollection: vi.fn(),
  writeAdminLog: vi.fn()
}))

vi.mock('../../../server/modules/shared/infrastructure/firebase-admin', () => ({
  getFirebaseAdminCollection
}))

vi.mock('../../../server/modules/auth/interfaces/http/session', () => ({
  writeAdminLog
}))

const classroomService = () => getClassroomsModule().service
const listAdminClassroomsForManagement = (
  ...parameters: Parameters<ClassroomsService['listAdminClassroomsForManagement']>
) => classroomService().listAdminClassroomsForManagement(...parameters)
const getAdminClassroomByUuid = (...parameters: Parameters<ClassroomsService['getAdminClassroomByUuid']>) =>
  classroomService().getAdminClassroomByUuid(...parameters)
const createAdminClassroom = (...parameters: Parameters<ClassroomsService['createAdminClassroom']>) =>
  classroomService().createAdminClassroom(...parameters)
const updateAdminClassroomByUuid = (...parameters: Parameters<ClassroomsService['updateAdminClassroomByUuid']>) =>
  classroomService().updateAdminClassroomByUuid(...parameters)
const deleteAdminClassroomByUuid = (...parameters: Parameters<ClassroomsService['deleteAdminClassroomByUuid']>) =>
  classroomService().deleteAdminClassroomByUuid(...parameters)

const createDocumentSnapshot = <TDocument extends { id: string }>(document: TDocument) => ({
  id: document.id,
  exists: true,
  data: () => {
    const { id: _id, ...payload } = document

    return payload
  }
})

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

const adminSession = {
  user: {
    id: 'admin-1',
    email: 'admin@example.com',
    fullName: 'Admin User',
    role: 'admin' as const,
    status: 'active' as const,
    region: 'feira-de-santana' as const,
    avatarUrl: null
  },
  issuedAt: '2026-05-08T00:00:00.000Z'
}

describe('classrooms utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists admin classrooms for management', async () => {
    const classroomOne = buildClassroom({
      id: 'classroom-1',
      name: 'Turma B',
      uuid: 'classroom-1'
    })
    const classroomTwo = buildClassroom({
      id: 'classroom-2',
      name: 'Turma A',
      uuid: 'classroom-2'
    })

    getFirebaseAdminCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'classrooms') {
        return {
          get: vi.fn().mockResolvedValue({
            docs: [createDocumentSnapshot(classroomOne), createDocumentSnapshot(classroomTwo)]
          })
        }
      }

      throw new Error(`Unexpected collection ${collectionName}`)
    })

    const classrooms = await listAdminClassroomsForManagement(adminSession)

    expect(classrooms.map((classroom) => classroom.name)).toEqual(['Turma A', 'Turma B'])
  })

  it('creates, updates, loads and soft deletes a classroom', async () => {
    const storedCourses = new Map<string, Course>()
    const storedClassrooms = new Map<string, Classroom>()
    const course = buildCourse({
      id: 'curso-1',
      title: 'Curso de Teologia Basica',
      slug: 'curso-de-teologia-basica'
    })

    storedCourses.set(course.id, course)

    getFirebaseAdminCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'courses') {
        return {
          doc: vi.fn((documentId?: string) => ({
            get: vi.fn().mockResolvedValue(
              documentId && storedCourses.has(documentId)
                ? createDocumentSnapshot(storedCourses.get(documentId)!)
                : { exists: false }
            )
          })),
          where: vi.fn((_fieldName: string, _operator: string, slug: string) => ({
            get: vi.fn().mockResolvedValue({
              docs: [...storedCourses.values()]
                .filter((storedCourse) => storedCourse.slug === slug)
                .map(createDocumentSnapshot)
            })
          }))
        }
      }

      if (collectionName === 'classrooms') {
        return {
          doc: vi.fn((documentId?: string) => ({
            get: vi.fn().mockResolvedValue(
              documentId && storedClassrooms.has(documentId)
                ? createDocumentSnapshot(storedClassrooms.get(documentId)!)
                : { exists: false }
            ),
            set: vi.fn(async (payload: Omit<Classroom, 'id'> | Partial<Classroom>) => {
              const current = documentId && storedClassrooms.has(documentId) ? storedClassrooms.get(documentId)! : null
              const nextDocument = {
                ...(current || {}),
                ...(payload as Record<string, unknown>),
                id: documentId || String((payload as { uuid?: string }).uuid || '')
              } as Classroom

              storedClassrooms.set(nextDocument.id, nextDocument)
            })
          })),
          get: vi.fn().mockResolvedValue({
            docs: [...storedClassrooms.values()].map(createDocumentSnapshot)
          }),
          where: vi.fn((_fieldName: string, _operator: string, uuid: string) => ({
            get: vi.fn().mockResolvedValue({
              docs: [...storedClassrooms.values()]
                .filter((storedClassroom) => storedClassroom.uuid === uuid)
                .map(createDocumentSnapshot)
            })
          }))
        }
      }

      throw new Error(`Unexpected collection ${collectionName}`)
    })

    const createdClassroom = await createAdminClassroom(adminSession, {
      name: 'Turma Principal 2026',
      uuid: '83b5fb4a-50ad-453e-a401-8deecf95804d',
      description: 'Turma principal do ano.',
      registrationOpen: true,
      registrationStartsAt: '2026-05-08T10:00:00.000Z',
      registrationEndsAt: '2026-05-30T22:00:00.000Z',
      linkedCourseIds: [course.id]
    })

    expect(createdClassroom.uuid).toBe('83b5fb4a-50ad-453e-a401-8deecf95804d')
    expect(storedClassrooms.get(createdClassroom.id)?.linkedCourseIds).toEqual([course.id])

    const loadedClassroom = await getAdminClassroomByUuid(adminSession, createdClassroom.uuid)

    expect(loadedClassroom.name).toBe('Turma Principal 2026')

    const updatedClassroom = await updateAdminClassroomByUuid(adminSession, createdClassroom.uuid, {
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

    const deletedClassroom = await deleteAdminClassroomByUuid(adminSession, createdClassroom.uuid)

    expect(deletedClassroom.deletedAt).not.toBeNull()
    expect(storedClassrooms.get(createdClassroom.id)?.deletedAt).not.toBeNull()
    expect(writeAdminLog).toHaveBeenCalledTimes(3)
  })
})
