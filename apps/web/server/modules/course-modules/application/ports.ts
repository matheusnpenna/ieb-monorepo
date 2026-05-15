import type { AdminModuleInput, AuthSessionContext, CourseModule, ModuleDetailData } from '@ieb/shared'

export interface CourseModulesBackendPort {
  listAdminModulesForManagement(session: AuthSessionContext): Promise<CourseModule[]>
  getAdminModuleBySlug(session: AuthSessionContext, moduleSlug: string): Promise<CourseModule>
  createAdminModule(session: AuthSessionContext, input: AdminModuleInput): Promise<CourseModule>
  updateAdminModuleBySlug(session: AuthSessionContext, moduleSlug: string, input: AdminModuleInput): Promise<CourseModule>
  deleteAdminModuleBySlug(session: AuthSessionContext, moduleSlug: string): Promise<CourseModule>
  getAccessibleModuleDetailBySlugs(
    session: AuthSessionContext,
    courseSlug: string,
    moduleSlug: string
  ): Promise<ModuleDetailData>
}

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
