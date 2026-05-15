import type { CourseModulesBackendPort } from '../application/ports'
import {
  createAdminModule,
  deleteAdminModuleBySlug,
  getAccessibleModuleDetailBySlugs,
  getAdminModuleBySlug,
  listAdminModulesForManagement,
  updateAdminModuleBySlug
} from '../../../utils/courses'

export class LegacyCourseModulesAdapter implements CourseModulesBackendPort {
  listAdminModulesForManagement = listAdminModulesForManagement
  getAdminModuleBySlug = getAdminModuleBySlug
  createAdminModule = createAdminModule
  updateAdminModuleBySlug = updateAdminModuleBySlug
  deleteAdminModuleBySlug = deleteAdminModuleBySlug
  getAccessibleModuleDetailBySlugs = getAccessibleModuleDetailBySlugs
}
