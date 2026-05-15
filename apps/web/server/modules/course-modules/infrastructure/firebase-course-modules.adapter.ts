import type { CourseModulesBackendPort } from '../application/ports'
import {
  createAdminModule,
  deleteAdminModuleBySlug,
  getAccessibleModuleDetailBySlugs,
  getAdminModuleBySlug,
  listAdminModulesForManagement,
  updateAdminModuleBySlug
} from '../../shared/infrastructure/course-catalog'

export class FirebaseCourseModulesAdapter implements CourseModulesBackendPort {
  listAdminModulesForManagement = listAdminModulesForManagement
  getAdminModuleBySlug = getAdminModuleBySlug
  createAdminModule = createAdminModule
  updateAdminModuleBySlug = updateAdminModuleBySlug
  deleteAdminModuleBySlug = deleteAdminModuleBySlug
  getAccessibleModuleDetailBySlugs = getAccessibleModuleDetailBySlugs
}
