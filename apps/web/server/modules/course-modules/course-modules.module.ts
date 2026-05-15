import { CourseModulesService } from './application/course-modules.service'
import { AdminLogAdapter } from './infrastructure/admin-log.adapter'
import { FirebaseCourseModulesAdapter } from './infrastructure/firebase-course-modules.adapter'

interface CourseModulesModule {
  service: CourseModulesService
  adminLog: AdminLogAdapter
}

let moduleInstance: CourseModulesModule | null = null

export const getCourseModulesModule = (): CourseModulesModule => {
  if (moduleInstance) {
    return moduleInstance
  }

  moduleInstance = {
    adminLog: new AdminLogAdapter(),
    service: new CourseModulesService({
      backend: new FirebaseCourseModulesAdapter()
    })
  }

  return moduleInstance
}
