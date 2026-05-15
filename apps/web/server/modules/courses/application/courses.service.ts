import type { AdminCourseInput, AuthSessionContext } from '@ieb/shared'
import type { CoursesBackendPort } from './ports'

interface CoursesServiceDependencies {
  backend: CoursesBackendPort
}

export class CoursesService {
  private readonly backend: CoursesBackendPort

  constructor(dependencies: CoursesServiceDependencies) {
    this.backend = dependencies.backend
  }

  async listAccessibleCourses(session: AuthSessionContext) {
    return await this.backend.listAccessibleCourses(session)
  }

  async getAccessibleCourseDetailBySlug(session: AuthSessionContext, courseSlug: string) {
    return await this.backend.getAccessibleCourseDetailBySlug(session, courseSlug)
  }

  async getHomeMetrics(session: AuthSessionContext) {
    return await this.backend.getHomeMetrics(session)
  }

  async listAdminCoursesForManagement(session: AuthSessionContext) {
    return await this.backend.listAdminCoursesForManagement(session)
  }

  async getAdminCourseBySlug(session: AuthSessionContext, courseSlug: string) {
    return await this.backend.getAdminCourseBySlug(session, courseSlug)
  }

  async createAdminCourse(session: AuthSessionContext, input: AdminCourseInput) {
    return await this.backend.createAdminCourse(session, input)
  }

  async updateAdminCourseBySlug(session: AuthSessionContext, courseSlug: string, input: AdminCourseInput) {
    return await this.backend.updateAdminCourseBySlug(session, courseSlug, input)
  }

  async deleteAdminCourseBySlug(session: AuthSessionContext, courseSlug: string) {
    return await this.backend.deleteAdminCourseBySlug(session, courseSlug)
  }
}
