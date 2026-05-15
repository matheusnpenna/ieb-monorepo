import type { AdminModuleInput, AuthSessionContext } from '@ieb/shared'
import type { CourseModulesBackendPort } from './ports'

interface CourseModulesServiceDependencies {
  backend: CourseModulesBackendPort
}

export class CourseModulesService {
  private readonly backend: CourseModulesBackendPort

  constructor(dependencies: CourseModulesServiceDependencies) {
    this.backend = dependencies.backend
  }

  async listAdminModulesForManagement(session: AuthSessionContext) {
    return await this.backend.listAdminModulesForManagement(session)
  }

  async getAdminModuleBySlug(session: AuthSessionContext, moduleSlug: string) {
    return await this.backend.getAdminModuleBySlug(session, moduleSlug)
  }

  async createAdminModule(session: AuthSessionContext, input: AdminModuleInput) {
    return await this.backend.createAdminModule(session, input)
  }

  async updateAdminModuleBySlug(session: AuthSessionContext, moduleSlug: string, input: AdminModuleInput) {
    return await this.backend.updateAdminModuleBySlug(session, moduleSlug, input)
  }

  async deleteAdminModuleBySlug(session: AuthSessionContext, moduleSlug: string) {
    return await this.backend.deleteAdminModuleBySlug(session, moduleSlug)
  }

  async getAccessibleModuleDetailBySlugs(session: AuthSessionContext, courseSlug: string, moduleSlug: string) {
    return await this.backend.getAccessibleModuleDetailBySlugs(session, courseSlug, moduleSlug)
  }
}
