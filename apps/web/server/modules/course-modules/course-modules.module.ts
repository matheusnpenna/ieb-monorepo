import { CourseModulesService } from './application/course-modules.service'
import { LegacyAdminLogAdapter } from './infrastructure/admin-log.adapter'
import { LegacyCourseModulesAdapter } from './infrastructure/legacy-course-modules.adapter'

interface CourseModulesModule {
  service: CourseModulesService
  adminLog: LegacyAdminLogAdapter
}

let moduleInstance: CourseModulesModule | null = null

export const getCourseModulesModule = (): CourseModulesModule => {
  if (moduleInstance) {
    return moduleInstance
  }

  moduleInstance = {
    adminLog: new LegacyAdminLogAdapter(),
    service: new CourseModulesService({
      backend: new LegacyCourseModulesAdapter()
    })
  }

  return moduleInstance
}
