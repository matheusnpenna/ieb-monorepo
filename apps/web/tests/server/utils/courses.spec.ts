import type { Course, CourseEnrollment } from '@ieb/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getFirebaseAdminCollection } = vi.hoisted(() => ({
  getFirebaseAdminCollection: vi.fn()
}))

vi.mock('../../../server/utils/firebase-admin', () => ({
  getFirebaseAdminCollection
}))

import { listAccessibleCourses } from '../../../server/utils/courses'

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
