import type { AuthSessionContext, Course, CourseEnrollment, User } from '@ieb/shared'

export interface AdminLogPort {
  write(
    session: AuthSessionContext,
    entry: {
      action: 'create' | 'update' | 'delete'
      targetCollection: string
      targetId: string
      summary: string
      metadata?: Record<string, unknown>
    }
  ): Promise<void>
}

export interface UserRepository {
  listAll(): Promise<User[]>
  findById(userId: string): Promise<User | null>
  findActiveByCpf(cpf: string): Promise<User | null>
  save(user: User, options?: { merge?: boolean }): Promise<void>
}

export interface UserAuthProvider {
  createUser(input: {
    email: string
    password?: string
    displayName: string
    disabled: boolean
  }): Promise<{ uid: string }>
  updateUser(
    userId: string,
    input: {
      email?: string
      password?: string
      displayName?: string
      disabled?: boolean
    }
  ): Promise<void>
  deleteUser(userId: string): Promise<void>
  revokeRefreshTokens(userId: string): Promise<void>
}

export interface UserCourseRepository {
  listAll(): Promise<Course[]>
}

export interface UserEnrollmentRepository {
  listByUserId(userId: string): Promise<CourseEnrollment[]>
  applyUserEnrollmentChanges(input: {
    userId: string
    desiredCourseIds: string[]
    currentEnrollments: CourseEnrollment[]
    manualClassroomId: string
    actorUserId: string
    timestamp: string
  }): Promise<void>
}

export interface UserClock {
  now(): string
}
