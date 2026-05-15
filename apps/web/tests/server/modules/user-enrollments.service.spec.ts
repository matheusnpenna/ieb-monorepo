import type { AuthSessionContext, Course, CourseEnrollment, User } from '@ieb/shared'
import { describe, expect, it, vi } from 'vitest'
import { UserEnrollmentsService } from '../../../server/modules/users/application/user-enrollments.service'
import type {
  AdminLogPort,
  UserCourseRepository,
  UserEnrollmentRepository,
  UserRepository
} from '../../../server/modules/users/application/ports'

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

const user: User = {
  id: 'user-1',
  role: 'student',
  status: 'active',
  fullName: 'Jane Doe',
  cpf: '12345678901',
  email: 'jane@example.com',
  phone: null,
  avatarUrl: null,
  region: 'aluno-externo',
  lastLoginAt: null,
  createdAt: '2026-05-08T00:00:00.000Z',
  updatedAt: '2026-05-08T00:00:00.000Z',
  deletedAt: null,
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedBy: null
}

const buildCourse = (overrides: Partial<Course> & Pick<Course, 'id' | 'title' | 'slug'>): Course => ({
  id: overrides.id,
  title: overrides.title,
  slug: overrides.slug,
  shortDescription: 'Resumo',
  description: 'Descricao',
  visibility: overrides.visibility || 'published',
  coverImageUrl: null,
  heroImageUrl: null,
  totalDurationInMinutes: 120,
  moduleIds: [],
  highlightIds: [],
  requiredCompletionRate: 80,
  certificateEnabled: true,
  createdAt: '2026-05-08T00:00:00.000Z',
  updatedAt: '2026-05-08T00:00:00.000Z',
  deletedAt: null,
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedBy: null
})

describe('user enrollments service', () => {
  it('validates selectable courses and applies enrollment changes', async () => {
    const courses = [buildCourse({ id: 'course-1', title: 'Curso 1', slug: 'curso-1' })]
    const enrollments: CourseEnrollment[] = []
    const userRepository: UserRepository = {
      listAll: vi.fn(),
      findById: vi.fn(async () => user),
      findActiveByCpf: vi.fn(),
      save: vi.fn()
    }
    const courseRepository: UserCourseRepository = {
      listAll: vi.fn(async () => courses)
    }
    const enrollmentRepository: UserEnrollmentRepository = {
      listByUserId: vi.fn(async () => enrollments),
      applyUserEnrollmentChanges: vi.fn()
    }
    const adminLog: AdminLogPort = {
      write: vi.fn()
    }
    const service = new UserEnrollmentsService({
      userRepository,
      courseRepository,
      enrollmentRepository,
      adminLog,
      clock: {
        now: () => '2026-05-08T12:00:00.000Z'
      }
    })

    await service.updateAdminUserEnrollments(adminSession, 'user-1', {
      courseIds: ['course-1']
    })

    expect(enrollmentRepository.applyUserEnrollmentChanges).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        desiredCourseIds: ['course-1'],
        manualClassroomId: 'manual-admin-enrollment'
      })
    )
    expect(adminLog.write).toHaveBeenCalledWith(
      adminSession,
      expect.objectContaining({
        targetCollection: 'enrollments',
        targetId: 'user-1'
      })
    )
  })
})
