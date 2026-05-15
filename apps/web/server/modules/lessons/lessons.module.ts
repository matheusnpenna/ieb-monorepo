import { LessonsService } from './application/lessons.service'
import { AdminLogAdapter } from './infrastructure/admin-log.adapter'
import { FirebaseLessonsAdapter } from './infrastructure/firebase-lessons.adapter'

interface LessonsModule {
  service: LessonsService
  adminLog: AdminLogAdapter
}

let moduleInstance: LessonsModule | null = null

export const getLessonsModule = (): LessonsModule => {
  if (moduleInstance) return moduleInstance

  moduleInstance = {
    adminLog: new AdminLogAdapter(),
    service: new LessonsService({
      backend: new FirebaseLessonsAdapter()
    })
  }

  return moduleInstance
}
