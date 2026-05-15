import type { AdminActionType, AuthSessionContext, Classroom, Course } from '@ieb/shared'

export interface ClassroomRepository {
  listAll(): Promise<Classroom[]>
  findById(classroomId: string): Promise<Classroom | null>
  findByUuid(classroomUuid: string): Promise<Classroom | null>
  save(classroom: Classroom): Promise<void>
}

export interface ClassroomCourseRepository {
  findById(courseId: string): Promise<Course | null>
  findBySlug(courseSlug: string): Promise<Course | null>
}

export interface ClassroomClock {
  now(): string
}

export interface ClassroomIdGenerator {
  create(): string
}

export interface AdminLogInput {
  action: AdminActionType
  targetCollection: string
  targetId: string
  summary: string
  metadata?: Record<string, unknown>
}

export interface AdminLogPort {
  write(session: AuthSessionContext, input: AdminLogInput): Promise<void>
}
