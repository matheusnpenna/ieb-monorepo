import type { Course, CourseEnrollment, CourseModule, Lesson, LessonProgress } from '@ieb/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getFirebaseAdminCollection } = vi.hoisted(() => ({
  getFirebaseAdminCollection: vi.fn()
}))

vi.mock('../../../server/utils/firebase-admin', () => ({
  getFirebaseAdminCollection
}))

import { getAccessibleCourseDetailBySlug, listAccessibleCourses } from '../../../server/utils/courses'

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
