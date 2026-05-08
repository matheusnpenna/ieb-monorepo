import type { Assessment, Course, CourseEnrollment, CourseModule, Lesson, LessonComment, LessonProgress } from '@ieb/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getFirebaseAdminCollection, getFirebaseAdminFirestore } = vi.hoisted(() => ({
  getFirebaseAdminCollection: vi.fn(),
  getFirebaseAdminFirestore: vi.fn(() => ({}))
}))

vi.mock('../../../server/utils/firebase-admin', () => ({
  getFirebaseAdminCollection,
  getFirebaseAdminFirestore
}))

import {
  createAdminCourse,
  createAdminModule,
  deleteAdminCourseBySlug,
  deleteAdminModuleBySlug,
  getAccessibleCourseDetailBySlug,
  getAccessibleModuleDetailBySlugs,
  getAccessibleLessonDetailBySlugs,
  getAdminCourseBySlug,
  getAdminModuleBySlug,
  getHomeMetrics,
  listAccessibleCourses,
  listAdminCoursesForManagement,
  listAdminModulesForManagement,
  listLessonCommentsBySlugs,
  markLessonAsCompletedBySlugs,
  updateAdminCourseBySlug,
  updateAdminModuleBySlug,
  updateLessonProgressBySlugs,
  createLessonCommentBySlugs,
  updateLessonCommentBySlugs,
  deleteLessonCommentBySlugs
} from '../../../server/utils/courses'

const buildCourse = (overrides: Partial<Course> & Pick<Course, 'id' | 'title' | 'slug'>): Course => ({
  id: overrides.id,
  title: overrides.title,
  slug: overrides.slug,
  shortDescription: overrides.shortDescription || 'Descricao curta',
  description: overrides.description || 'Descricao completa',
  visibility: overrides.visibility || 'published',
  coverImageUrl: overrides.coverImageUrl ?? null,
  heroImageUrl: overrides.heroImageUrl ?? null,
  totalDurationInMinutes: overrides.totalDurationInMinutes || 120,
  moduleIds: overrides.moduleIds || [],
  highlightIds: overrides.highlightIds || [],
  requiredCompletionRate: overrides.requiredCompletionRate || 80,
  certificateEnabled: overrides.certificateEnabled ?? true,
  createdAt: overrides.createdAt || '2026-01-01T00:00:00.000Z',
  updatedAt: overrides.updatedAt || '2026-01-01T00:00:00.000Z',
  deletedAt: overrides.deletedAt ?? null,
  createdBy: overrides.createdBy ?? null,
  updatedBy: overrides.updatedBy ?? null,
  deletedBy: overrides.deletedBy ?? null
})

const buildEnrollment = (
  overrides: Partial<CourseEnrollment> & Pick<CourseEnrollment, 'id' | 'courseId' | 'userId'>
): CourseEnrollment => ({
  id: overrides.id,
  userId: overrides.userId,
  classroomId: overrides.classroomId || 'classroom-1',
  courseId: overrides.courseId,
  status: overrides.status || 'active',
  startedAt: overrides.startedAt || '2026-01-01T00:00:00.000Z',
  completedAt: overrides.completedAt ?? null,
  certificateIssuedAt: overrides.certificateIssuedAt ?? null,
  createdAt: overrides.createdAt || '2026-01-01T00:00:00.000Z',
  updatedAt: overrides.updatedAt || '2026-01-01T00:00:00.000Z',
  deletedAt: overrides.deletedAt ?? null,
  createdBy: overrides.createdBy ?? null,
  updatedBy: overrides.updatedBy ?? null,
  deletedBy: overrides.deletedBy ?? null
})

const buildModule = (
  overrides: Partial<CourseModule> & Pick<CourseModule, 'id' | 'courseId' | 'title' | 'slug'>
): CourseModule => ({
  id: overrides.id,
  courseId: overrides.courseId,
  title: overrides.title,
  slug: overrides.slug,
  description: overrides.description || 'Descricao do modulo',
  order: overrides.order || 1,
  lessonIds: overrides.lessonIds || [],
  assessmentIds: overrides.assessmentIds || [],
  estimatedDurationInMinutes: overrides.estimatedDurationInMinutes || 60,
  createdAt: overrides.createdAt || '2026-01-01T00:00:00.000Z',
  updatedAt: overrides.updatedAt || '2026-01-01T00:00:00.000Z',
  deletedAt: overrides.deletedAt ?? null,
  createdBy: overrides.createdBy ?? null,
  updatedBy: overrides.updatedBy ?? null,
  deletedBy: overrides.deletedBy ?? null
})

const buildLesson = (overrides: Partial<Lesson> & Pick<Lesson, 'id' | 'courseId' | 'moduleId' | 'title' | 'slug'>): Lesson => ({
  id: overrides.id,
  courseId: overrides.courseId,
  moduleId: overrides.moduleId,
  title: overrides.title,
  slug: overrides.slug,
  description: overrides.description || 'Descricao da aula',
  order: overrides.order || 1,
  contentType: overrides.contentType || 'video',
  videoProvider: overrides.videoProvider ?? 'youtube',
  mediaUrl: overrides.mediaUrl ?? 'https://example.com/video',
  thumbnailUrl: overrides.thumbnailUrl ?? null,
  durationInMinutes: overrides.durationInMinutes || 15,
  bodyContent: overrides.bodyContent ?? null,
  allowManualCompletion: overrides.allowManualCompletion ?? true,
  createdAt: overrides.createdAt || '2026-01-01T00:00:00.000Z',
  updatedAt: overrides.updatedAt || '2026-01-01T00:00:00.000Z',
  deletedAt: overrides.deletedAt ?? null,
  createdBy: overrides.createdBy ?? null,
  updatedBy: overrides.updatedBy ?? null,
  deletedBy: overrides.deletedBy ?? null
})

const buildLessonProgress = (
  overrides: Partial<LessonProgress> & Pick<LessonProgress, 'id' | 'userId' | 'courseId' | 'moduleId' | 'lessonId'>
): LessonProgress => ({
  id: overrides.id,
  userId: overrides.userId,
  courseId: overrides.courseId,
  moduleId: overrides.moduleId,
  lessonId: overrides.lessonId,
  watchedMinutes: overrides.watchedMinutes ?? 5,
  completionRate: overrides.completionRate ?? 25,
  lastPositionInSeconds: overrides.lastPositionInSeconds ?? 120,
  markedAsCompleted: overrides.markedAsCompleted ?? false,
  completedAt: overrides.completedAt ?? null,
  createdAt: overrides.createdAt || '2026-01-01T00:00:00.000Z',
  updatedAt: overrides.updatedAt || '2026-01-01T00:00:00.000Z',
  deletedAt: overrides.deletedAt ?? null,
  createdBy: overrides.createdBy ?? null,
  updatedBy: overrides.updatedBy ?? null,
  deletedBy: overrides.deletedBy ?? null
})

const buildAssessment = (
  overrides: Partial<Assessment> & Pick<Assessment, 'id' | 'courseId' | 'moduleId' | 'title' | 'slug'>
): Assessment => ({
  id: overrides.id,
  courseId: overrides.courseId,
  moduleId: overrides.moduleId,
  title: overrides.title,
  slug: overrides.slug,
  description: overrides.description || 'Descricao da avaliacao',
  passingScore: overrides.passingScore ?? 70,
  timeLimitInMinutes: overrides.timeLimitInMinutes ?? 30,
  questions: overrides.questions ?? [],
  createdAt: overrides.createdAt || '2026-01-01T00:00:00.000Z',
  updatedAt: overrides.updatedAt || '2026-01-01T00:00:00.000Z',
  deletedAt: overrides.deletedAt ?? null,
  createdBy: overrides.createdBy ?? null,
  updatedBy: overrides.updatedBy ?? null,
  deletedBy: overrides.deletedBy ?? null
})

const buildLessonComment = (
  overrides: Partial<LessonComment> &
    Pick<LessonComment, 'id' | 'userId' | 'courseId' | 'moduleId' | 'lessonId' | 'content'>
): LessonComment => ({
  id: overrides.id,
  userId: overrides.userId,
  courseId: overrides.courseId,
  moduleId: overrides.moduleId,
  lessonId: overrides.lessonId,
  content: overrides.content,
  createdAt: overrides.createdAt || '2026-01-01T00:00:00.000Z',
  updatedAt: overrides.updatedAt || overrides.createdAt || '2026-01-01T00:00:00.000Z',
  deletedAt: overrides.deletedAt ?? null,
  createdBy: overrides.createdBy ?? overrides.userId,
  updatedBy: overrides.updatedBy ?? overrides.userId,
  deletedBy: overrides.deletedBy ?? null
})

const createDocumentSnapshot = <TDocument extends { id: string }>(document: TDocument) => ({
  id: document.id,
  exists: true,
  data: () => {
    const { id: _id, ...data } = document
    return data
  }
})

describe('listAccessibleCourses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns only published active courses from the authenticated student enrollments', async () => {
    const publishedCourse = buildCourse({
      id: 'course-2',
      title: 'Apologetica',
      slug: 'apologetica'
    })
    const anotherPublishedCourse = buildCourse({
      id: 'course-1',
      title: 'Biblia',
      slug: 'biblia'
    })
    const draftCourse = buildCourse({
      id: 'course-3',
      title: 'Rascunho',
      slug: 'rascunho',
      visibility: 'draft'
    })
    const deletedCourse = buildCourse({
      id: 'course-4',
      title: 'Arquivado',
      slug: 'arquivado',
      deletedAt: '2026-02-01T00:00:00.000Z'
    })

    const enrollments = [
      buildEnrollment({ id: 'enrollment-1', userId: 'student-1', courseId: 'course-2', status: 'active' }),
      buildEnrollment({ id: 'enrollment-2', userId: 'student-1', courseId: 'course-1', status: 'completed' }),
      buildEnrollment({ id: 'enrollment-3', userId: 'student-1', courseId: 'course-1', status: 'active' }),
      buildEnrollment({ id: 'enrollment-4', userId: 'student-1', courseId: 'course-3', status: 'active' }),
      buildEnrollment({ id: 'enrollment-5', userId: 'student-1', courseId: 'course-4', status: 'active' }),
      buildEnrollment({ id: 'enrollment-6', userId: 'student-1', courseId: 'course-5', status: 'cancelled' })
    ]

    const courseSnapshots = new Map([
      ['course-1', createDocumentSnapshot(anotherPublishedCourse)],
      ['course-2', createDocumentSnapshot(publishedCourse)],
      ['course-3', createDocumentSnapshot(draftCourse)],
      ['course-4', createDocumentSnapshot(deletedCourse)]
    ])

    const enrollmentsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: enrollments.map((enrollment) => ({
            data: () => enrollment
          }))
        })
      })
    }

    const coursesCollection = {
      doc: vi.fn((courseId: string) => ({
        get: vi.fn().mockResolvedValue(
          courseSnapshots.get(courseId) || {
            id: courseId,
            exists: false,
            data: () => undefined
          }
        )
      }))
    }

    getFirebaseAdminCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'enrollments') {
        return enrollmentsCollection
      }

      if (collectionName === 'courses') {
        return coursesCollection
      }

      throw new Error(`Unexpected collection ${collectionName}`)
    })

    const courses = await listAccessibleCourses({
      user: {
        id: 'student-1',
        email: 'student@example.com',
        fullName: 'Student One',
        role: 'student',
        status: 'active',
        region: 'feira-de-santana',
        avatarUrl: null
      },
      issuedAt: '2026-05-06T00:00:00.000Z'
    })

    expect(courses.map((course) => course.id)).toEqual(['course-2', 'course-1'])
    expect(coursesCollection.doc).toHaveBeenCalledTimes(4)
  })

  it('returns every non-deleted course for admins', async () => {
    const coursesCollection = {
      get: vi.fn().mockResolvedValue({
        docs: [
          createDocumentSnapshot(
            buildCourse({
              id: 'course-2',
              title: 'Zelo Pastoral',
              slug: 'zelo-pastoral',
              visibility: 'draft'
            })
          ),
          createDocumentSnapshot(
            buildCourse({
              id: 'course-1',
              title: 'Apologetica',
              slug: 'apologetica'
            })
          ),
          createDocumentSnapshot(
            buildCourse({
              id: 'course-3',
              title: 'Excluido',
              slug: 'excluido',
              deletedAt: '2026-03-01T00:00:00.000Z'
            })
          )
        ]
      })
    }

    getFirebaseAdminCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'courses') {
        return coursesCollection
      }

      throw new Error(`Unexpected collection ${collectionName}`)
    })

    const courses = await listAccessibleCourses({
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        fullName: 'Admin One',
        role: 'admin',
        status: 'active',
        region: 'feira-de-santana',
        avatarUrl: null
      },
      issuedAt: '2026-05-06T00:00:00.000Z'
    })

    expect(courses.map((course) => course.id)).toEqual(['course-1', 'course-2'])
    expect(coursesCollection.get).toHaveBeenCalledTimes(1)
  })
})

describe('admin course management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    issuedAt: '2026-05-07T00:00:00.000Z'
  }

  it('lists admin courses for management', async () => {
    const courseOne = buildCourse({
      id: 'curso-a',
      title: 'Curso A',
      slug: 'curso-a'
    })
    const courseTwo = buildCourse({
      id: 'curso-b',
      title: 'Curso B',
      slug: 'curso-b'
    })

    getFirebaseAdminCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'courses') {
        return {
          get: vi.fn().mockResolvedValue({
            docs: [createDocumentSnapshot(courseTwo), createDocumentSnapshot(courseOne)]
          })
        }
      }

      throw new Error(`Unexpected collection ${collectionName}`)
    })

    const courses = await listAdminCoursesForManagement(adminSession)

    expect(courses.map((course) => course.slug)).toEqual(['curso-a', 'curso-b'])
  })

  it('creates, updates, loads and soft deletes a course while writing admin logs', async () => {
    const adminLogSet = vi.fn().mockResolvedValue(undefined)
    const courseSet = vi.fn().mockResolvedValue(undefined)
    const storedCourses = new Map<string, Course>()

    getFirebaseAdminCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'courses') {
        return {
          doc: vi.fn((documentId?: string) => ({
            get: vi.fn().mockResolvedValue(
              documentId && storedCourses.has(documentId)
                ? createDocumentSnapshot(storedCourses.get(documentId)!)
                : { exists: false }
            ),
            set: vi.fn(async (payload: Record<string, unknown>) => {
              const existingCourse = documentId ? storedCourses.get(documentId) : undefined
              const nextCourse = {
                ...(existingCourse || {}),
                ...(payload as Course),
                id: documentId
              } as Course

              if (documentId) {
                storedCourses.set(documentId, nextCourse)
              }

              return await courseSet(payload)
            })
          }))
        }
      }

      if (collectionName === 'adminLogs') {
        return {
          doc: vi.fn(() => ({
            id: 'log-1',
            set: adminLogSet
          }))
        }
      }

      throw new Error(`Unexpected collection ${collectionName}`)
    })

    const createdCourse = await createAdminCourse(adminSession, {
      title: 'Curso de Lideranca',
      slug: 'curso-de-lideranca',
      shortDescription: 'Descricao curta',
      description: 'Descricao completa do curso',
      visibility: 'draft',
      coverImageUrl: '',
      heroImageUrl: null,
      totalDurationInMinutes: 180,
      requiredCompletionRate: 80,
      certificateEnabled: true
    })

    expect(createdCourse.slug).toBe('curso-de-lideranca')
    expect(createdCourse.createdBy).toBe('admin-1')
    expect(adminLogSet).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'create',
        targetCollection: 'courses',
        targetId: 'curso-de-lideranca'
      })
    )

    const loadedCourse = await getAdminCourseBySlug(adminSession, 'curso-de-lideranca')
    expect(loadedCourse.title).toBe('Curso de Lideranca')

    const updatedCourse = await updateAdminCourseBySlug(adminSession, 'curso-de-lideranca', {
      title: 'Curso de Lideranca Atualizado',
      slug: 'curso-de-lideranca',
      shortDescription: 'Descricao curta atualizada',
      description: 'Descricao completa atualizada',
      visibility: 'published',
      coverImageUrl: 'https://example.com/capa.png',
      heroImageUrl: 'https://example.com/hero.png',
      totalDurationInMinutes: 240,
      requiredCompletionRate: 90,
      certificateEnabled: false
    })

    expect(updatedCourse.title).toBe('Curso de Lideranca Atualizado')
    expect(updatedCourse.visibility).toBe('published')
    expect(adminLogSet).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'update',
        targetCollection: 'courses',
        targetId: 'curso-de-lideranca'
      })
    )

    const deletedCourse = await deleteAdminCourseBySlug(adminSession, 'curso-de-lideranca')

    expect(deletedCourse.deletedAt).toBeTruthy()
    expect(adminLogSet).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'delete',
        targetCollection: 'courses',
        targetId: 'curso-de-lideranca'
      })
    )
  })

  it('creates a unique slug automatically when a course with the same base slug already exists', async () => {
    const existingCourse = buildCourse({
      id: 'curso-de-lideranca',
      title: 'Curso de Lideranca',
      slug: 'curso-de-lideranca'
    })
    const adminLogSet = vi.fn().mockResolvedValue(undefined)
    const storedCourses = new Map<string, Course>([[existingCourse.id, existingCourse]])

    getFirebaseAdminCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'courses') {
        return {
          doc: vi.fn((documentId?: string) => ({
            get: vi.fn().mockResolvedValue(
              documentId && storedCourses.has(documentId)
                ? createDocumentSnapshot(storedCourses.get(documentId)!)
                : { exists: false }
            ),
            set: vi.fn(async (payload: Record<string, unknown>) => {
              if (documentId) {
                storedCourses.set(documentId, payload as Course)
              }
            })
          }))
        }
      }

      if (collectionName === 'adminLogs') {
        return {
          doc: vi.fn(() => ({
            id: 'log-1',
            set: adminLogSet
          }))
        }
      }

      throw new Error(`Unexpected collection ${collectionName}`)
    })

    const createdCourse = await createAdminCourse(adminSession, {
      title: 'Curso de Lideranca',
      slug: '',
      shortDescription: 'Descricao curta',
      description: 'Descricao completa do curso',
      visibility: 'draft',
      coverImageUrl: null,
      heroImageUrl: null,
      totalDurationInMinutes: 180,
      requiredCompletionRate: 80,
      certificateEnabled: true
    })

    expect(createdCourse.slug).toMatch(/^\d{4}-curso-de-lideranca$/)
    expect(createdCourse.slug).not.toBe('curso-de-lideranca')
    expect(adminLogSet).toHaveBeenCalledWith(
      expect.objectContaining({
        targetId: createdCourse.slug
      })
    )
  })
})

describe('admin module management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    issuedAt: '2026-05-07T00:00:00.000Z'
  }

  it('lists admin modules for management ordered by course and order', async () => {
    const moduleOne = buildModule({
      id: 'modulo-b',
      courseId: 'curso-1',
      title: 'Modulo B',
      slug: 'modulo-b',
      order: 2
    })
    const moduleTwo = buildModule({
      id: 'modulo-a',
      courseId: 'curso-1',
      title: 'Modulo A',
      slug: 'modulo-a',
      order: 1
    })

    getFirebaseAdminCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'modules') {
        return {
          get: vi.fn().mockResolvedValue({
            docs: [createDocumentSnapshot(moduleOne), createDocumentSnapshot(moduleTwo)]
          })
        }
      }

      throw new Error(`Unexpected collection ${collectionName}`)
    })

    const modules = await listAdminModulesForManagement(adminSession)

    expect(modules.map((module) => module.slug)).toEqual(['modulo-a', 'modulo-b'])
  })

  it('creates, updates, loads and soft deletes a module while syncing the course order', async () => {
    const adminLogSet = vi.fn().mockResolvedValue(undefined)
    const storedCourses = new Map<string, Course>()
    const storedModules = new Map<string, CourseModule>()
    const baseCourse = buildCourse({
      id: 'teologia-basica',
      title: 'Teologia Basica',
      slug: 'teologia-basica',
      moduleIds: []
    })

    storedCourses.set(baseCourse.id, baseCourse)

    getFirebaseAdminCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'courses') {
        return {
          get: vi.fn().mockResolvedValue({
            docs: [...storedCourses.values()].map(createDocumentSnapshot)
          }),
          where: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({ docs: [] })
          })),
          doc: vi.fn((documentId?: string) => ({
            get: vi.fn().mockResolvedValue(
              documentId && storedCourses.has(documentId)
                ? createDocumentSnapshot(storedCourses.get(documentId)!)
                : { exists: false }
            ),
            set: vi.fn(async (payload: Record<string, unknown>, options?: { merge?: boolean }) => {
              if (!documentId) {
                return
              }

              const existingCourse = storedCourses.get(documentId)
              const nextCourse =
                options?.merge && existingCourse
                  ? ({ ...existingCourse, ...(payload as Partial<Course>), id: documentId } as Course)
                  : ({ ...(payload as Course), id: documentId } as Course)

              storedCourses.set(documentId, nextCourse)
            })
          }))
        }
      }

      if (collectionName === 'modules') {
        return {
          get: vi.fn().mockResolvedValue({
            docs: [...storedModules.values()].map(createDocumentSnapshot)
          }),
          where: vi.fn((fieldName: string, _operator: string, courseId: string) => ({
            get: vi.fn().mockResolvedValue({
              docs:
                fieldName === 'courseId'
                  ? [...storedModules.values()]
                      .filter((module) => module.courseId === courseId)
                      .map(createDocumentSnapshot)
                  : []
            })
          })),
          doc: vi.fn((documentId?: string) => ({
            get: vi.fn().mockResolvedValue(
              documentId && storedModules.has(documentId)
                ? createDocumentSnapshot(storedModules.get(documentId)!)
                : { exists: false }
            ),
            set: vi.fn(async (payload: Record<string, unknown>, options?: { merge?: boolean }) => {
              if (!documentId) {
                return
              }

              const existingModule = storedModules.get(documentId)
              const nextModule =
                options?.merge && existingModule
                  ? ({ ...existingModule, ...(payload as Partial<CourseModule>), id: documentId } as CourseModule)
                  : ({ ...(existingModule || {}), ...(payload as Partial<CourseModule>), id: documentId } as CourseModule)

              storedModules.set(documentId, nextModule)
            })
          }))
        }
      }

      if (collectionName === 'adminLogs') {
        return {
          doc: vi.fn(() => ({
            id: 'log-1',
            set: adminLogSet
          }))
        }
      }

      throw new Error(`Unexpected collection ${collectionName}`)
    })

    const createdModule = await createAdminModule(adminSession, {
      courseId: baseCourse.id,
      title: 'Fundamentos da Fe',
      slug: 'fundamentos-da-fe',
      description: 'Bases do curso',
      order: 1,
      estimatedDurationInMinutes: 90
    })

    expect(createdModule.slug).toBe('fundamentos-da-fe')
    expect(storedCourses.get(baseCourse.id)?.moduleIds).toEqual(['fundamentos-da-fe'])
    expect(adminLogSet).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'create',
        targetCollection: 'modules',
        targetId: 'fundamentos-da-fe'
      })
    )

    const loadedModule = await getAdminModuleBySlug(adminSession, 'fundamentos-da-fe')
    expect(loadedModule.title).toBe('Fundamentos da Fe')

    const updatedModule = await updateAdminModuleBySlug(adminSession, 'fundamentos-da-fe', {
      courseId: baseCourse.id,
      title: 'Fundamentos revisados',
      slug: 'fundamentos-da-fe',
      description: 'Bases revisadas do curso',
      order: 1,
      estimatedDurationInMinutes: 120
    })

    expect(updatedModule.title).toBe('Fundamentos revisados')
    expect(updatedModule.estimatedDurationInMinutes).toBe(120)
    expect(adminLogSet).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'update',
        targetCollection: 'modules',
        targetId: 'fundamentos-da-fe'
      })
    )

    const deletedModule = await deleteAdminModuleBySlug(adminSession, 'fundamentos-da-fe')

    expect(deletedModule.deletedAt).toBeTruthy()
    expect(storedCourses.get(baseCourse.id)?.moduleIds).toEqual([])
    expect(adminLogSet).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'delete',
        targetCollection: 'modules',
        targetId: 'fundamentos-da-fe'
      })
    )
  })

  it('creates a unique slug automatically when a module with the same base slug already exists', async () => {
    const adminLogSet = vi.fn().mockResolvedValue(undefined)
    const baseCourse = buildCourse({
      id: 'teologia-basica',
      title: 'Teologia Basica',
      slug: 'teologia-basica',
      moduleIds: ['fundamentos-da-fe']
    })
    const existingModule = buildModule({
      id: 'fundamentos-da-fe',
      courseId: baseCourse.id,
      title: 'Fundamentos da Fe',
      slug: 'fundamentos-da-fe'
    })
    const storedCourses = new Map<string, Course>([[baseCourse.id, baseCourse]])
    const storedModules = new Map<string, CourseModule>([[existingModule.id, existingModule]])

    getFirebaseAdminCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'courses') {
        return {
          doc: vi.fn((documentId?: string) => ({
            get: vi.fn().mockResolvedValue(
              documentId && storedCourses.has(documentId)
                ? createDocumentSnapshot(storedCourses.get(documentId)!)
                : { exists: false }
            ),
            set: vi.fn(async (payload: Record<string, unknown>, options?: { merge?: boolean }) => {
              if (!documentId) {
                return
              }

              const existingCourse = storedCourses.get(documentId)
              const nextCourse =
                options?.merge && existingCourse
                  ? ({ ...existingCourse, ...(payload as Partial<Course>), id: documentId } as Course)
                  : ({ ...(payload as Course), id: documentId } as Course)

              storedCourses.set(documentId, nextCourse)
            })
          }))
        }
      }

      if (collectionName === 'modules') {
        return {
          where: vi.fn((_fieldName: string, _operator: string, courseId: string) => ({
            get: vi.fn().mockResolvedValue({
              docs: [...storedModules.values()]
                .filter((module) => module.courseId === courseId)
                .map(createDocumentSnapshot)
            })
          })),
          doc: vi.fn((documentId?: string) => ({
            get: vi.fn().mockResolvedValue(
              documentId && storedModules.has(documentId)
                ? createDocumentSnapshot(storedModules.get(documentId)!)
                : { exists: false }
            ),
            set: vi.fn(async (payload: Record<string, unknown>) => {
              if (documentId) {
                storedModules.set(documentId, payload as CourseModule)
              }
            })
          }))
        }
      }

      if (collectionName === 'adminLogs') {
        return {
          doc: vi.fn(() => ({
            id: 'log-1',
            set: adminLogSet
          }))
        }
      }

      throw new Error(`Unexpected collection ${collectionName}`)
    })

    const createdModule = await createAdminModule(adminSession, {
      courseId: baseCourse.id,
      title: 'Fundamentos da Fe',
      slug: '',
      description: 'Nova descricao',
      order: 2,
      estimatedDurationInMinutes: 60
    })

    expect(createdModule.slug).toMatch(/^\d{4}-fundamentos-da-fe$/)
    expect(createdModule.slug).not.toBe('fundamentos-da-fe')
    expect(adminLogSet).toHaveBeenCalledWith(
      expect.objectContaining({
        targetId: createdModule.slug
      })
    )
  })

  it('loads a legacy module by slug even when the document id is different', async () => {
    const baseCourse = buildCourse({
      id: 'teologia-basica',
      title: 'Teologia Basica',
      slug: 'teologia-basica',
      moduleIds: ['module-doc-1']
    })
    const legacyModule = buildModule({
      id: 'module-doc-1',
      courseId: baseCourse.id,
      title: 'Fundamentos da Fe',
      slug: 'fundamentos-da-fe'
    })

    getFirebaseAdminCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'modules') {
        return {
          doc: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({ exists: false })
          })),
          where: vi.fn((fieldName: string, _operator: string, fieldValue: string) => ({
            get: vi.fn().mockResolvedValue({
              docs:
                fieldName === 'slug' && fieldValue === legacyModule.slug
                  ? [createDocumentSnapshot(legacyModule)]
                  : []
            })
          }))
        }
      }

      throw new Error(`Unexpected collection ${collectionName}`)
    })

    const loadedModule = await getAdminModuleBySlug(adminSession, 'fundamentos-da-fe')

    expect(loadedModule.id).toBe('module-doc-1')
    expect(loadedModule.slug).toBe('fundamentos-da-fe')
  })
})

describe('getHomeMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns continue watching data and completed courses count for the authenticated student', async () => {
    const courseOne = buildCourse({
      id: 'curso-de-teologia-basica',
      title: 'Curso de Teologia Basica',
      slug: 'curso-de-teologia-basica',
      moduleIds: ['modulo-01']
    })
    const courseTwo = buildCourse({
      id: 'curso-de-lideranca',
      title: 'Curso de Lideranca',
      slug: 'curso-de-lideranca',
      moduleIds: ['modulo-02']
    })
    const moduleOne = buildModule({
      id: 'modulo-01',
      courseId: courseOne.id,
      title: 'Modulo 01',
      slug: 'fundamentos',
      lessonIds: ['aula-01']
    })
    const moduleTwo = buildModule({
      id: 'modulo-02',
      courseId: courseTwo.id,
      title: 'Modulo 02',
      slug: 'pratica',
      lessonIds: ['aula-02']
    })
    const lessonOne = buildLesson({
      id: 'aula-01',
      courseId: courseOne.id,
      moduleId: moduleOne.id,
      title: 'Aula 01',
      slug: 'introducao'
    })
    const lessonTwo = buildLesson({
      id: 'aula-02',
      courseId: courseTwo.id,
      moduleId: moduleTwo.id,
      title: 'Aula 02',
      slug: 'liderando-equipes'
    })

    const coursesCollection = {
      doc: vi.fn((courseId: string) => ({
        get: vi.fn().mockResolvedValue(
          createDocumentSnapshot(courseId === courseOne.id ? courseOne : courseTwo)
        )
      }))
    }
    const enrollmentsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [
            { data: () => buildEnrollment({ id: 'enrollment-1', userId: 'student-1', courseId: courseOne.id, status: 'active' }) },
            {
              data: () =>
                buildEnrollment({
                  id: 'enrollment-2',
                  userId: 'student-1',
                  courseId: courseTwo.id,
                  status: 'completed',
                  completedAt: '2026-05-01T00:00:00.000Z'
                })
            }
          ]
        })
      })
    }
    const modulesCollection = {
      where: vi.fn((field: string, operator: string, courseId: string) => ({
        get: vi.fn().mockResolvedValue({
          docs: [createDocumentSnapshot(courseId === courseOne.id ? moduleOne : moduleTwo)]
        })
      }))
    }
    const lessonsCollection = {
      where: vi.fn((field: string, operator: string, courseId: string) => ({
        get: vi.fn().mockResolvedValue({
          docs: [createDocumentSnapshot(courseId === courseOne.id ? lessonOne : lessonTwo)]
        })
      }))
    }
    const lessonProgressCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [
            createDocumentSnapshot(
              buildLessonProgress({
                id: 'lesson-progress-1',
                userId: 'student-1',
                courseId: courseOne.id,
                moduleId: moduleOne.id,
                lessonId: lessonOne.id,
                watchedMinutes: 3,
                lastPositionInSeconds: 180,
                completionRate: 20,
                updatedAt: '2026-05-06T10:00:00.000Z'
              })
            ),
            createDocumentSnapshot(
              buildLessonProgress({
                id: 'lesson-progress-2',
                userId: 'student-1',
                courseId: courseTwo.id,
                moduleId: moduleTwo.id,
                lessonId: lessonTwo.id,
                watchedMinutes: 8,
                lastPositionInSeconds: 420,
                completionRate: 55,
                updatedAt: '2026-05-07T12:00:00.000Z'
              })
            )
          ]
        })
      })
    }

    getFirebaseAdminCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'courses') return coursesCollection
      if (collectionName === 'enrollments') return enrollmentsCollection
      if (collectionName === 'modules') return modulesCollection
      if (collectionName === 'lessons') return lessonsCollection
      if (collectionName === 'lessonProgress') return lessonProgressCollection
      throw new Error(`Unexpected collection ${collectionName}`)
    })

    const metrics = await getHomeMetrics({
      user: {
        id: 'student-1',
        email: 'student@example.com',
        fullName: 'Student One',
        role: 'student',
        status: 'active',
        region: 'feira-de-santana',
        avatarUrl: null
      },
      issuedAt: '2026-05-07T00:00:00.000Z'
    })

    expect(metrics).toEqual({
      continueWatching: {
        lessonTitle: 'Aula 02',
        courseTitle: 'Curso de Lideranca',
        href: '/curso/curso-de-lideranca/modulo/pratica/aula/liderando-equipes'
      },
      completedCourses: {
        count: 1
      }
    })
  })
})

describe('getAccessibleCourseDetailBySlug', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the course and ordered modules for an enrolled student', async () => {
    const course = buildCourse({
      id: 'curso-de-teologia-basica',
      title: 'Curso de Teologia Basica',
      slug: 'curso-de-teologia-basica',
      moduleIds: ['modulo-02', 'modulo-01']
    })
    const moduleOne = buildModule({
      id: 'modulo-01',
      courseId: course.id,
      title: 'Modulo 01',
      slug: 'modulo-01',
      order: 1
    })
    const moduleTwo = buildModule({
      id: 'modulo-02',
      courseId: course.id,
      title: 'Modulo 02',
      slug: 'modulo-02',
      order: 2
    })
    const deletedModule = buildModule({
      id: 'modulo-03',
      courseId: course.id,
      title: 'Modulo Excluido',
      slug: 'modulo-excluido',
      deletedAt: '2026-02-01T00:00:00.000Z'
    })
    const firstLessonFromFirstModule = buildLesson({
      id: 'aula-02-01',
      courseId: course.id,
      moduleId: moduleTwo.id,
      title: 'Aula 01',
      slug: 'aula-01',
      order: 2
    })
    const prioritizedLessonFromFirstModule = buildLesson({
      id: 'aula-02-02',
      courseId: course.id,
      moduleId: moduleTwo.id,
      title: 'Aula 02',
      slug: 'aula-02',
      order: 1
    })
    const continueWatchingLesson = buildLesson({
      id: 'aula-01-01',
      courseId: course.id,
      moduleId: moduleOne.id,
      title: 'Aula 03',
      slug: 'aula-03',
      order: 1
    })

    const coursesCollection = {
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(createDocumentSnapshot(course))
      }))
    }

    const enrollmentsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [
            {
              data: () =>
                buildEnrollment({
                  id: 'enrollment-1',
                  userId: 'student-1',
                  courseId: course.id,
                  status: 'active'
                })
            }
          ]
        })
      })
    }

    const modulesCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [
            createDocumentSnapshot(moduleOne),
            createDocumentSnapshot(moduleTwo),
            createDocumentSnapshot(deletedModule)
          ]
        })
      })
    }

    const lessonsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [
            createDocumentSnapshot(firstLessonFromFirstModule),
            createDocumentSnapshot(prioritizedLessonFromFirstModule),
            createDocumentSnapshot(continueWatchingLesson)
          ]
        })
      })
    }

    const lessonProgressCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [
            createDocumentSnapshot(
              buildLessonProgress({
                id: 'lesson-progress-1',
                userId: 'student-1',
                courseId: course.id,
                moduleId: moduleOne.id,
                lessonId: continueWatchingLesson.id,
                updatedAt: '2026-05-05T12:00:00.000Z'
              })
            )
          ]
        })
      })
    }

    getFirebaseAdminCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'courses') return coursesCollection
      if (collectionName === 'enrollments') return enrollmentsCollection
      if (collectionName === 'modules') return modulesCollection
      if (collectionName === 'lessons') return lessonsCollection
      if (collectionName === 'lessonProgress') return lessonProgressCollection
      throw new Error(`Unexpected collection ${collectionName}`)
    })

    const detail = await getAccessibleCourseDetailBySlug(
      {
        user: {
          id: 'student-1',
          email: 'student@example.com',
          fullName: 'Student One',
          role: 'student',
          status: 'active',
          region: 'feira-de-santana',
          avatarUrl: null
        },
        issuedAt: '2026-05-06T00:00:00.000Z'
      },
      course.slug
    )

    expect(detail.course.id).toBe(course.id)
    expect(detail.modules.map((module) => module.id)).toEqual(['modulo-02', 'modulo-01'])
    expect(detail.actions).toEqual({
      startCourseHref: '/curso/curso-de-teologia-basica/modulo/modulo-02/aula/aula-02',
      continueWatchingHref: '/curso/curso-de-teologia-basica/modulo/modulo-01/aula/aula-03'
    })
  })

  it('throws when the student does not have access to the requested course', async () => {
    const course = buildCourse({
      id: 'curso-de-teologia-basica',
      title: 'Curso de Teologia Basica',
      slug: 'curso-de-teologia-basica'
    })

    const coursesCollection = {
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(createDocumentSnapshot(course))
      }))
    }

    const enrollmentsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: []
        })
      })
    }

    getFirebaseAdminCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'courses') return coursesCollection
      if (collectionName === 'enrollments') return enrollmentsCollection
      throw new Error(`Unexpected collection ${collectionName}`)
    })

    await expect(
      getAccessibleCourseDetailBySlug(
        {
          user: {
            id: 'student-1',
            email: 'student@example.com',
            fullName: 'Student One',
            role: 'student',
            status: 'active',
            region: 'feira-de-santana',
            avatarUrl: null
          },
          issuedAt: '2026-05-06T00:00:00.000Z'
        },
        course.slug
      )
    ).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Voce nao tem acesso a este curso.'
    })
  })
})

describe('getAccessibleModuleDetailBySlugs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the module detail with ordered lessons, assessment and progress summary', async () => {
    const course = buildCourse({
      id: 'curso-de-teologia-basica',
      title: 'Curso de Teologia Basica',
      slug: 'curso-de-teologia-basica',
      moduleIds: ['modulo-01']
    })
    const module = buildModule({
      id: 'modulo-01',
      courseId: course.id,
      title: 'Modulo 01',
      slug: 'fundamentos',
      lessonIds: ['aula-02', 'aula-01', 'aula-03'],
      assessmentIds: ['avaliacao-02', 'avaliacao-01']
    })
    const lessonOne = buildLesson({
      id: 'aula-01',
      courseId: course.id,
      moduleId: module.id,
      title: 'Aula 01',
      slug: 'aula-01',
      order: 2
    })
    const lessonTwo = buildLesson({
      id: 'aula-02',
      courseId: course.id,
      moduleId: module.id,
      title: 'Aula 02',
      slug: 'aula-02',
      order: 3
    })
    const lessonThree = buildLesson({
      id: 'aula-03',
      courseId: course.id,
      moduleId: module.id,
      title: 'Aula 03',
      slug: 'aula-03',
      order: 1
    })
    const selectedAssessment = buildAssessment({
      id: 'avaliacao-02',
      courseId: course.id,
      moduleId: module.id,
      title: 'Avaliacao principal',
      slug: 'avaliacao-principal'
    })
    const secondaryAssessment = buildAssessment({
      id: 'avaliacao-01',
      courseId: course.id,
      moduleId: module.id,
      title: 'Avaliacao secundaria',
      slug: 'avaliacao-secundaria'
    })

    const coursesCollection = {
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(createDocumentSnapshot(course))
      }))
    }

    const enrollmentsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [
            {
              data: () =>
                buildEnrollment({
                  id: 'enrollment-1',
                  userId: 'student-1',
                  courseId: course.id,
                  status: 'active'
                })
            }
          ]
        })
      })
    }

    const modulesCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [createDocumentSnapshot(module)]
        })
      })
    }

    const lessonsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [
            createDocumentSnapshot(lessonOne),
            createDocumentSnapshot(lessonTwo),
            createDocumentSnapshot(lessonThree)
          ]
        })
      })
    }

    const assessmentsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [
            createDocumentSnapshot(secondaryAssessment),
            createDocumentSnapshot(selectedAssessment)
          ]
        })
      })
    }

    const lessonProgressCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [
            createDocumentSnapshot(
              buildLessonProgress({
                id: 'lesson-progress-1',
                userId: 'student-1',
                courseId: course.id,
                moduleId: module.id,
                lessonId: lessonOne.id,
                completionRate: 100,
                watchedMinutes: 20,
                lastPositionInSeconds: 900
              })
            ),
            createDocumentSnapshot(
              buildLessonProgress({
                id: 'lesson-progress-2',
                userId: 'student-1',
                courseId: course.id,
                moduleId: module.id,
                lessonId: lessonThree.id,
                markedAsCompleted: true,
                watchedMinutes: 15,
                lastPositionInSeconds: 600
              })
            ),
            createDocumentSnapshot(
              buildLessonProgress({
                id: 'lesson-progress-3',
                userId: 'student-1',
                courseId: course.id,
                moduleId: module.id,
                lessonId: lessonTwo.id,
                completionRate: 60,
                watchedMinutes: 10,
                lastPositionInSeconds: 300
              })
            )
          ]
        })
      })
    }

    getFirebaseAdminCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'courses') return coursesCollection
      if (collectionName === 'enrollments') return enrollmentsCollection
      if (collectionName === 'modules') return modulesCollection
      if (collectionName === 'lessons') return lessonsCollection
      if (collectionName === 'assessments') return assessmentsCollection
      if (collectionName === 'lessonProgress') return lessonProgressCollection
      throw new Error(`Unexpected collection ${collectionName}`)
    })

    const detail = await getAccessibleModuleDetailBySlugs(
      {
        user: {
          id: 'student-1',
          email: 'student@example.com',
          fullName: 'Student One',
          role: 'student',
          status: 'active',
          region: 'feira-de-santana',
          avatarUrl: null
        },
        issuedAt: '2026-05-07T00:00:00.000Z'
      },
      course.slug,
      module.slug
    )

    expect(detail.module.id).toBe(module.id)
    expect(detail.lessons.map((lesson) => lesson.id)).toEqual(['aula-02', 'aula-01', 'aula-03'])
    expect(detail.lessons.map((lesson) => lesson.isCompleted)).toEqual([false, true, true])
    expect(detail.assessment?.id).toBe('avaliacao-02')
    expect(detail.progress).toEqual({
      completionPercentage: 67,
      completedLessons: 2,
      totalLessons: 3
    })
  })

  it('throws when the requested module does not belong to the accessible course', async () => {
    const course = buildCourse({
      id: 'curso-de-teologia-basica',
      title: 'Curso de Teologia Basica',
      slug: 'curso-de-teologia-basica',
      moduleIds: ['modulo-01']
    })
    const module = buildModule({
      id: 'modulo-01',
      courseId: course.id,
      title: 'Modulo 01',
      slug: 'fundamentos'
    })

    const coursesCollection = {
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(createDocumentSnapshot(course))
      }))
    }

    const enrollmentsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [
            {
              data: () =>
                buildEnrollment({
                  id: 'enrollment-1',
                  userId: 'student-1',
                  courseId: course.id,
                  status: 'active'
                })
            }
          ]
        })
      })
    }

    const modulesCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [createDocumentSnapshot(module)]
        })
      })
    }

    const lessonsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: []
        })
      })
    }

    const lessonProgressCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: []
        })
      })
    }

    getFirebaseAdminCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'courses') return coursesCollection
      if (collectionName === 'enrollments') return enrollmentsCollection
      if (collectionName === 'modules') return modulesCollection
      if (collectionName === 'lessons') return lessonsCollection
      if (collectionName === 'lessonProgress') return lessonProgressCollection
      throw new Error(`Unexpected collection ${collectionName}`)
    })

    await expect(
      getAccessibleModuleDetailBySlugs(
        {
          user: {
            id: 'student-1',
            email: 'student@example.com',
            fullName: 'Student One',
            role: 'student',
            status: 'active',
            region: 'feira-de-santana',
            avatarUrl: null
          },
          issuedAt: '2026-05-07T00:00:00.000Z'
        },
        course.slug,
        'modulo-inexistente'
      )
    ).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Modulo nao encontrado.'
    })
  })
})

describe('markLessonAsCompletedBySlugs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates or updates the lesson progress document and marks the lesson as completed', async () => {
    const course = buildCourse({
      id: 'curso-de-teologia-basica',
      title: 'Curso de Teologia Basica',
      slug: 'curso-de-teologia-basica',
      moduleIds: ['modulo-01']
    })
    const module = buildModule({
      id: 'modulo-01',
      courseId: course.id,
      title: 'Modulo 01',
      slug: 'fundamentos',
      lessonIds: ['aula-01']
    })
    const lesson = buildLesson({
      id: 'aula-01',
      courseId: course.id,
      moduleId: module.id,
      title: 'Aula 01',
      slug: 'introducao',
      durationInMinutes: 18
    })

    const coursesCollection = {
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(createDocumentSnapshot(course))
      }))
    }

    const enrollmentsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [
            {
              data: () =>
                buildEnrollment({
                  id: 'enrollment-1',
                  userId: 'student-1',
                  courseId: course.id,
                  status: 'active'
                })
            }
          ]
        })
      })
    }

    const modulesCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [createDocumentSnapshot(module)]
        })
      })
    }

    const lessonsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [createDocumentSnapshot(lesson)]
        })
      })
    }

    const assessmentsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: []
        })
      })
    }

    const lessonProgressDocSet = vi.fn().mockResolvedValue(undefined)
    const lessonProgressCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: []
        })
      }),
      doc: vi.fn(() => ({
        set: lessonProgressDocSet
      }))
    }

    getFirebaseAdminCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'courses') return coursesCollection
      if (collectionName === 'enrollments') return enrollmentsCollection
      if (collectionName === 'modules') return modulesCollection
      if (collectionName === 'lessons') return lessonsCollection
      if (collectionName === 'assessments') return assessmentsCollection
      if (collectionName === 'lessonProgress') return lessonProgressCollection
      throw new Error(`Unexpected collection ${collectionName}`)
    })

    const result = await markLessonAsCompletedBySlugs(
      {
        user: {
          id: 'student-1',
          email: 'student@example.com',
          fullName: 'Student One',
          role: 'student',
          status: 'active',
          region: 'feira-de-santana',
          avatarUrl: null
        },
        issuedAt: '2026-05-07T00:00:00.000Z'
      },
      course.slug,
      module.slug,
      lesson.slug
    )

    expect(result).toEqual({
      lessonId: lesson.id,
      isCompleted: true
    })
    expect(lessonProgressCollection.doc).toHaveBeenCalledWith('student-1_aula-01')
    expect(lessonProgressDocSet).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'student-1',
        courseId: course.id,
        moduleId: module.id,
        lessonId: lesson.id,
        watchedMinutes: 18,
        completionRate: 100,
        lastPositionInSeconds: 1080,
        markedAsCompleted: true,
        createdBy: 'student-1',
        updatedBy: 'student-1'
      }),
      { merge: true }
    )
  })
})

describe('getAccessibleLessonDetailBySlugs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the lesson detail with video url, progress and lesson navigation', async () => {
    const course = buildCourse({
      id: 'curso-de-teologia-basica',
      title: 'Curso de Teologia Basica',
      slug: 'curso-de-teologia-basica',
      moduleIds: ['modulo-01']
    })
    const module = buildModule({
      id: 'modulo-01',
      courseId: course.id,
      title: 'Modulo 01',
      slug: 'fundamentos',
      lessonIds: ['aula-01', 'aula-02', 'aula-03']
    })
    const lessonOne = buildLesson({
      id: 'aula-01',
      courseId: course.id,
      moduleId: module.id,
      title: 'Aula 01',
      slug: 'aula-01',
      mediaUrl: 'https://cdn.example.com/aula-01.m3u8'
    })
    const lessonTwo = buildLesson({
      id: 'aula-02',
      courseId: course.id,
      moduleId: module.id,
      title: 'Aula 02',
      slug: 'aula-02'
    })
    const lessonThree = buildLesson({
      id: 'aula-03',
      courseId: course.id,
      moduleId: module.id,
      title: 'Aula 03',
      slug: 'aula-03'
    })

    const coursesCollection = {
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(createDocumentSnapshot(course))
      }))
    }
    const enrollmentsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [{ data: () => buildEnrollment({ id: 'enrollment-1', userId: 'student-1', courseId: course.id }) }]
        })
      })
    }
    const modulesCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ docs: [createDocumentSnapshot(module)] })
      })
    }
    const lessonsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [createDocumentSnapshot(lessonOne), createDocumentSnapshot(lessonTwo), createDocumentSnapshot(lessonThree)]
        })
      })
    }
    const assessmentsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ docs: [] })
      })
    }
    const lessonProgressCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [
            createDocumentSnapshot(
              buildLessonProgress({
                id: 'lesson-progress-1',
                userId: 'student-1',
                courseId: course.id,
                moduleId: module.id,
                lessonId: lessonTwo.id,
                lastPositionInSeconds: 327,
                watchedMinutes: 6,
                completionRate: 42
              })
            )
          ]
        })
      })
    }

    getFirebaseAdminCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'courses') return coursesCollection
      if (collectionName === 'enrollments') return enrollmentsCollection
      if (collectionName === 'modules') return modulesCollection
      if (collectionName === 'lessons') return lessonsCollection
      if (collectionName === 'assessments') return assessmentsCollection
      if (collectionName === 'lessonProgress') return lessonProgressCollection
      throw new Error(`Unexpected collection ${collectionName}`)
    })

    const detail = await getAccessibleLessonDetailBySlugs(
      {
        user: {
          id: 'student-1',
          email: 'student@example.com',
          fullName: 'Student One',
          role: 'student',
          status: 'active',
          region: 'feira-de-santana',
          avatarUrl: null
        },
        issuedAt: '2026-05-07T00:00:00.000Z'
      },
      course.slug,
      module.slug,
      lessonTwo.slug
    )

    expect(detail.lesson.id).toBe(lessonTwo.id)
    expect(detail.progress).toEqual({
      lastPositionInSeconds: 327,
      watchedMinutes: 6,
      completionRate: 42,
      isCompleted: false
    })
    expect(detail.previousLesson?.slug).toBe('aula-01')
    expect(detail.nextLesson?.slug).toBe('aula-03')
  })

  it('navigates across module boundaries when the current lesson is at the edge of a module', async () => {
    const course = buildCourse({
      id: 'curso-de-teologia-basica',
      title: 'Curso de Teologia Basica',
      slug: 'curso-de-teologia-basica',
      moduleIds: ['modulo-01', 'modulo-02']
    })
    const firstModule = buildModule({
      id: 'modulo-01',
      courseId: course.id,
      title: 'Modulo 01',
      slug: 'fundamentos',
      lessonIds: ['aula-01', 'aula-02']
    })
    const secondModule = buildModule({
      id: 'modulo-02',
      courseId: course.id,
      title: 'Modulo 02',
      slug: 'aprofundamento',
      lessonIds: ['aula-03']
    })
    const lessonOne = buildLesson({
      id: 'aula-01',
      courseId: course.id,
      moduleId: firstModule.id,
      title: 'Aula 01',
      slug: 'aula-01'
    })
    const lessonTwo = buildLesson({
      id: 'aula-02',
      courseId: course.id,
      moduleId: firstModule.id,
      title: 'Aula 02',
      slug: 'aula-02'
    })
    const lessonThree = buildLesson({
      id: 'aula-03',
      courseId: course.id,
      moduleId: secondModule.id,
      title: 'Aula 03',
      slug: 'aula-03'
    })

    const coursesCollection = {
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(createDocumentSnapshot(course))
      }))
    }
    const enrollmentsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [{ data: () => buildEnrollment({ id: 'enrollment-1', userId: 'student-1', courseId: course.id }) }]
        })
      })
    }
    const modulesCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [createDocumentSnapshot(firstModule), createDocumentSnapshot(secondModule)]
        })
      })
    }
    const lessonsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [createDocumentSnapshot(lessonOne), createDocumentSnapshot(lessonTwo), createDocumentSnapshot(lessonThree)]
        })
      })
    }
    const lessonProgressCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: []
        })
      })
    }

    getFirebaseAdminCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'courses') return coursesCollection
      if (collectionName === 'enrollments') return enrollmentsCollection
      if (collectionName === 'modules') return modulesCollection
      if (collectionName === 'lessons') return lessonsCollection
      if (collectionName === 'lessonProgress') return lessonProgressCollection
      throw new Error(`Unexpected collection ${collectionName}`)
    })

    const firstLessonDetail = await getAccessibleLessonDetailBySlugs(
      {
        user: {
          id: 'student-1',
          email: 'student@example.com',
          fullName: 'Student One',
          role: 'student',
          status: 'active',
          region: 'feira-de-santana',
          avatarUrl: null
        },
        issuedAt: '2026-05-07T00:00:00.000Z'
      },
      course.slug,
      firstModule.slug,
      lessonOne.slug
    )

    expect(firstLessonDetail.previousLesson).toBeNull()
    expect(firstLessonDetail.nextLesson?.href).toBe('/curso/curso-de-teologia-basica/modulo/fundamentos/aula/aula-02')

    const boundaryLessonDetail = await getAccessibleLessonDetailBySlugs(
      {
        user: {
          id: 'student-1',
          email: 'student@example.com',
          fullName: 'Student One',
          role: 'student',
          status: 'active',
          region: 'feira-de-santana',
          avatarUrl: null
        },
        issuedAt: '2026-05-07T00:00:00.000Z'
      },
      course.slug,
      firstModule.slug,
      lessonTwo.slug
    )

    expect(boundaryLessonDetail.previousLesson?.href).toBe('/curso/curso-de-teologia-basica/modulo/fundamentos/aula/aula-01')
    expect(boundaryLessonDetail.nextLesson?.href).toBe(
      '/curso/curso-de-teologia-basica/modulo/aprofundamento/aula/aula-03'
    )
  })
})

describe('updateLessonProgressBySlugs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('persists the current video position and derives completion state from it', async () => {
    const course = buildCourse({
      id: 'curso-de-teologia-basica',
      title: 'Curso de Teologia Basica',
      slug: 'curso-de-teologia-basica',
      moduleIds: ['modulo-01']
    })
    const module = buildModule({
      id: 'modulo-01',
      courseId: course.id,
      title: 'Modulo 01',
      slug: 'fundamentos',
      lessonIds: ['aula-01']
    })
    const lesson = buildLesson({
      id: 'aula-01',
      courseId: course.id,
      moduleId: module.id,
      title: 'Aula 01',
      slug: 'introducao',
      durationInMinutes: 10
    })
    const existingProgress = buildLessonProgress({
      id: 'lesson-progress-1',
      userId: 'student-1',
      courseId: course.id,
      moduleId: module.id,
      lessonId: lesson.id,
      watchedMinutes: 2,
      lastPositionInSeconds: 120,
      completionRate: 20
    })

    const coursesCollection = {
      doc: vi.fn(() => ({ get: vi.fn().mockResolvedValue(createDocumentSnapshot(course)) }))
    }
    const enrollmentsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [{ data: () => buildEnrollment({ id: 'enrollment-1', userId: 'student-1', courseId: course.id }) }]
        })
      })
    }
    const modulesCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ docs: [createDocumentSnapshot(module)] })
      })
    }
    const lessonsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ docs: [createDocumentSnapshot(lesson)] })
      })
    }
    const assessmentsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ docs: [] })
      })
    }
    const lessonProgressDocSet = vi.fn().mockResolvedValue(undefined)
    const lessonProgressCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ docs: [createDocumentSnapshot(existingProgress)] })
      }),
      doc: vi.fn(() => ({ set: lessonProgressDocSet }))
    }

    getFirebaseAdminCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'courses') return coursesCollection
      if (collectionName === 'enrollments') return enrollmentsCollection
      if (collectionName === 'modules') return modulesCollection
      if (collectionName === 'lessons') return lessonsCollection
      if (collectionName === 'assessments') return assessmentsCollection
      if (collectionName === 'lessonProgress') return lessonProgressCollection
      throw new Error(`Unexpected collection ${collectionName}`)
    })

    const progress = await updateLessonProgressBySlugs(
      {
        user: {
          id: 'student-1',
          email: 'student@example.com',
          fullName: 'Student One',
          role: 'student',
          status: 'active',
          region: 'feira-de-santana',
          avatarUrl: null
        },
        issuedAt: '2026-05-07T00:00:00.000Z'
      },
      course.slug,
      module.slug,
      lesson.slug,
      {
        lastPositionInSeconds: 451
      }
    )

    expect(progress).toEqual({
      lessonId: lesson.id,
      lastPositionInSeconds: 451,
      watchedMinutes: 8,
      completionRate: 75,
      isCompleted: false
    })
    expect(lessonProgressDocSet).toHaveBeenCalledWith(
      expect.objectContaining({
        lastPositionInSeconds: 451,
        watchedMinutes: 8,
        completionRate: 75,
        markedAsCompleted: false
      }),
      { merge: true }
    )
  })

  it('allows unmarking an already completed lesson', async () => {
    const course = buildCourse({
      id: 'curso-de-teologia-basica',
      title: 'Curso de Teologia Basica',
      slug: 'curso-de-teologia-basica',
      moduleIds: ['modulo-01']
    })
    const module = buildModule({
      id: 'modulo-01',
      courseId: course.id,
      title: 'Modulo 01',
      slug: 'fundamentos',
      lessonIds: ['aula-01']
    })
    const lesson = buildLesson({
      id: 'aula-01',
      courseId: course.id,
      moduleId: module.id,
      title: 'Aula 01',
      slug: 'introducao',
      durationInMinutes: 10
    })
    const existingProgress = buildLessonProgress({
      id: 'lesson-progress-1',
      userId: 'student-1',
      courseId: course.id,
      moduleId: module.id,
      lessonId: lesson.id,
      watchedMinutes: 10,
      lastPositionInSeconds: 600,
      completionRate: 100,
      markedAsCompleted: true,
      completedAt: '2026-05-07T00:00:00.000Z'
    })

    const coursesCollection = {
      doc: vi.fn(() => ({ get: vi.fn().mockResolvedValue(createDocumentSnapshot(course)) }))
    }
    const enrollmentsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [{ data: () => buildEnrollment({ id: 'enrollment-1', userId: 'student-1', courseId: course.id }) }]
        })
      })
    }
    const modulesCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ docs: [createDocumentSnapshot(module)] })
      })
    }
    const lessonsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ docs: [createDocumentSnapshot(lesson)] })
      })
    }
    const assessmentsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ docs: [] })
      })
    }
    const lessonProgressDocSet = vi.fn().mockResolvedValue(undefined)
    const lessonProgressCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ docs: [createDocumentSnapshot(existingProgress)] })
      }),
      doc: vi.fn(() => ({ set: lessonProgressDocSet }))
    }

    getFirebaseAdminCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'courses') return coursesCollection
      if (collectionName === 'enrollments') return enrollmentsCollection
      if (collectionName === 'modules') return modulesCollection
      if (collectionName === 'lessons') return lessonsCollection
      if (collectionName === 'assessments') return assessmentsCollection
      if (collectionName === 'lessonProgress') return lessonProgressCollection
      throw new Error(`Unexpected collection ${collectionName}`)
    })

    const progress = await updateLessonProgressBySlugs(
      {
        user: {
          id: 'student-1',
          email: 'student@example.com',
          fullName: 'Student One',
          role: 'student',
          status: 'active',
          region: 'feira-de-santana',
          avatarUrl: null
        },
        issuedAt: '2026-05-07T00:00:00.000Z'
      },
      course.slug,
      module.slug,
      lesson.slug,
      {
        lastPositionInSeconds: 600,
        markAsCompleted: false,
        hasCompletionOverride: true
      }
    )

    expect(progress).toEqual({
      lessonId: lesson.id,
      lastPositionInSeconds: 600,
      watchedMinutes: 10,
      completionRate: 99,
      isCompleted: false
    })
    expect(lessonProgressDocSet).toHaveBeenCalledWith(
      expect.objectContaining({
        lastPositionInSeconds: 600,
        watchedMinutes: 10,
        completionRate: 99,
        markedAsCompleted: false,
        completedAt: null
      }),
      { merge: true }
    )
  })
})

describe('lesson comments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists, creates, updates and deletes comments scoped to the accessible lesson', async () => {
    const course = buildCourse({
      id: 'curso-de-teologia-basica',
      title: 'Curso de Teologia Basica',
      slug: 'curso-de-teologia-basica',
      moduleIds: ['modulo-01']
    })
    const module = buildModule({
      id: 'modulo-01',
      courseId: course.id,
      title: 'Modulo 01',
      slug: 'fundamentos',
      lessonIds: ['aula-01']
    })
    const lesson = buildLesson({
      id: 'aula-01',
      courseId: course.id,
      moduleId: module.id,
      title: 'Aula 01',
      slug: 'introducao'
    })
    const existingComment = buildLessonComment({
      id: 'comment-1',
      userId: 'student-1',
      courseId: course.id,
      moduleId: module.id,
      lessonId: lesson.id,
      content: 'Primeiro comentario'
    })
    const secondComment = buildLessonComment({
      id: 'comment-2',
      userId: 'student-2',
      courseId: course.id,
      moduleId: module.id,
      lessonId: lesson.id,
      content: 'Segundo comentario',
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z'
    })

    const coursesCollection = {
      doc: vi.fn(() => ({ get: vi.fn().mockResolvedValue(createDocumentSnapshot(course)) }))
    }
    const enrollmentsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [{ data: () => buildEnrollment({ id: 'enrollment-1', userId: 'student-1', courseId: course.id }) }]
        })
      })
    }
    const modulesCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ docs: [createDocumentSnapshot(module)] })
      })
    }
    const lessonsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ docs: [createDocumentSnapshot(lesson)] })
      })
    }
    const assessmentsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ docs: [] })
      })
    }
    const lessonProgressCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ docs: [] })
      })
    }
    const commentDocSet = vi.fn().mockResolvedValue(undefined)
    let commentsDocs = [createDocumentSnapshot(existingComment), createDocumentSnapshot(secondComment)]
    const lessonCommentsCollection = {
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockImplementation(async () => ({ docs: commentsDocs }))
      }),
      doc: vi.fn((commentId?: string) => ({
        id: commentId || 'generated-comment-id',
        get: vi.fn().mockImplementation(async () => {
          const comment = [existingComment, secondComment].find((item) => item.id === commentId)
          return comment ? createDocumentSnapshot(comment) : { exists: false }
        }),
        set: commentDocSet
      }))
    }
    const usersCollection = {
      doc: vi.fn((userId: string) => ({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            fullName: userId === 'student-1' ? 'Student One' : 'Student Two',
            avatarUrl: null
          })
        })
      }))
    }

    getFirebaseAdminCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'courses') return coursesCollection
      if (collectionName === 'enrollments') return enrollmentsCollection
      if (collectionName === 'modules') return modulesCollection
      if (collectionName === 'lessons') return lessonsCollection
      if (collectionName === 'assessments') return assessmentsCollection
      if (collectionName === 'lessonProgress') return lessonProgressCollection
      if (collectionName === 'lessonComments') return lessonCommentsCollection
      if (collectionName === 'users') return usersCollection
      throw new Error(`Unexpected collection ${collectionName}`)
    })

    const session = {
      user: {
        id: 'student-1',
        email: 'student@example.com',
        fullName: 'Student One',
        role: 'student' as const,
        status: 'active' as const,
        region: 'feira-de-santana' as const,
        avatarUrl: null
      },
      issuedAt: '2026-05-07T00:00:00.000Z'
    }

    const listedComments = await listLessonCommentsBySlugs(session, course.slug, module.slug, lesson.slug)
    expect(listedComments.map((comment) => comment.id)).toEqual(['comment-1', 'comment-2'])
    expect(listedComments[0]?.canEdit).toBe(true)
    expect(listedComments[1]?.canEdit).toBe(false)

    const createdComment = await createLessonCommentBySlugs(
      session,
      course.slug,
      module.slug,
      lesson.slug,
      '  Novo comentario  '
    )
    expect(createdComment.content).toBe('Novo comentario')
    expect(commentDocSet).toHaveBeenCalled()

    const updatedComment = await updateLessonCommentBySlugs(
      session,
      course.slug,
      module.slug,
      lesson.slug,
      existingComment.id,
      'Comentario editado'
    )
    expect(updatedComment.content).toBe('Comentario editado')
    expect(updatedComment.isEdited).toBe(true)

    await deleteLessonCommentBySlugs(session, course.slug, module.slug, lesson.slug, existingComment.id)
    expect(commentDocSet).toHaveBeenCalled()
  })
})
