import type {
  AdminUserEnrollmentsData,
  AdminUserEnrollmentsInput,
  AuthSessionContext,
  Course
} from '@ieb/shared'
import type { AdminLogPort, UserClock, UserCourseRepository, UserEnrollmentRepository, UserRepository } from './ports'
import { createUserError } from '../domain/errors'
import { MANUAL_CLASSROOM_ID, normalizeCourseIds } from '../domain/validation'

interface UserEnrollmentsServiceDependencies {
  userRepository: UserRepository
  courseRepository: UserCourseRepository
  enrollmentRepository: UserEnrollmentRepository
  adminLog: AdminLogPort
  clock: UserClock
}

export class UserEnrollmentsService {
  private readonly userRepository: UserRepository
  private readonly courseRepository: UserCourseRepository
  private readonly enrollmentRepository: UserEnrollmentRepository
  private readonly adminLog: AdminLogPort
  private readonly clock: UserClock

  constructor(dependencies: UserEnrollmentsServiceDependencies) {
    this.userRepository = dependencies.userRepository
    this.courseRepository = dependencies.courseRepository
    this.enrollmentRepository = dependencies.enrollmentRepository
    this.adminLog = dependencies.adminLog
    this.clock = dependencies.clock
  }

  async listAdminUserEnrollments(
    session: AuthSessionContext,
    userId: string
  ): Promise<AdminUserEnrollmentsData> {
    this.assertAdminSession(session)

    return await this.getUserEnrollmentsData(userId.trim())
  }

  async updateAdminUserEnrollments(
    session: AuthSessionContext,
    userId: string,
    input: AdminUserEnrollmentsInput
  ): Promise<AdminUserEnrollmentsData> {
    this.assertAdminSession(session)

    const normalizedUserId = userId.trim()
    const desiredCourseIds = normalizeCourseIds(input.courseIds)
    const currentData = await this.getUserEnrollmentsData(normalizedUserId)
    const selectableCourseIds = new Set(currentData.courses.map((course) => course.id))
    const invalidCourseIds = desiredCourseIds.filter((courseId) => !selectableCourseIds.has(courseId))

    if (invalidCourseIds.length > 0) {
      throw createUserError(400, 'Informe apenas cursos validos para matricula.')
    }

    await this.enrollmentRepository.applyUserEnrollmentChanges({
      userId: currentData.user.id,
      desiredCourseIds,
      currentEnrollments: currentData.enrollments,
      manualClassroomId: MANUAL_CLASSROOM_ID,
      actorUserId: session.user.id,
      timestamp: this.clock.now()
    })

    await this.adminLog.write(session, {
      action: 'update',
      targetCollection: 'enrollments',
      targetId: currentData.user.id,
      summary: 'Atualizou as matriculas de um usuario.',
      metadata: {
        userId: currentData.user.id,
        desiredCourseIds
      }
    })

    return await this.getUserEnrollmentsData(normalizedUserId)
  }

  private async getUserEnrollmentsData(userId: string): Promise<AdminUserEnrollmentsData> {
    const normalizedUserId = userId.trim()

    if (!normalizedUserId) {
      throw createUserError(400, 'Informe um identificador valido para o usuario.')
    }

    const user = await this.userRepository.findById(normalizedUserId)

    if (!user || user.deletedAt) {
      throw createUserError(404, 'Usuario nao encontrado.')
    }

    const [courses, enrollments] = await Promise.all([
      this.listSelectableCourses(),
      this.enrollmentRepository.listByUserId(user.id)
    ])

    return {
      user,
      courses,
      enrollments
    }
  }

  private async listSelectableCourses(): Promise<Course[]> {
    return (await this.courseRepository.listAll())
      .filter((course) => this.isSelectableCourse(course))
      .sort((left, right) => left.title.localeCompare(right.title, 'pt-BR'))
  }

  private isSelectableCourse(course: Course) {
    return !course.deletedAt && course.visibility !== 'archived'
  }

  private assertAdminSession(session: AuthSessionContext) {
    if (session.user.role !== 'admin') {
      throw createUserError(403, 'Acesso restrito ao painel administrativo.')
    }
  }
}
