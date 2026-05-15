import { AssessmentsService } from './application/assessments.service'
import { AdminLogAdapter } from './infrastructure/admin-log.adapter'
import { FirebaseAssessmentsAdapter } from './infrastructure/firebase-assessments.adapter'

interface AssessmentsModule {
  service: AssessmentsService
  adminLog: AdminLogAdapter
}

let moduleInstance: AssessmentsModule | null = null

export const getAssessmentsModule = (): AssessmentsModule => {
  if (moduleInstance) return moduleInstance

  moduleInstance = {
    adminLog: new AdminLogAdapter(),
    service: new AssessmentsService({
      backend: new FirebaseAssessmentsAdapter()
    })
  }

  return moduleInstance
}
