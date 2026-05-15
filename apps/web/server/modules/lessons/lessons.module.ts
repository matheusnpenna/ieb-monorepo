import { LessonsService } from './application/lessons.service'
import { LegacyAdminLogAdapter } from './infrastructure/admin-log.adapter'
import { LegacyLessonsAdapter } from './infrastructure/legacy-lessons.adapter'

interface LessonsModule {
  service: LessonsService
  adminLog: LegacyAdminLogAdapter
}

let moduleInstance: LessonsModule | null = null

export const getLessonsModule = (): LessonsModule => {
  if (moduleInstance) return moduleInstance

  moduleInstance = {
    adminLog: new LegacyAdminLogAdapter(),
    service: new LessonsService({
      backend: new LegacyLessonsAdapter()
    })
  }

  return moduleInstance
}
