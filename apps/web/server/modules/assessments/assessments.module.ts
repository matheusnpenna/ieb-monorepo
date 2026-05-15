import { AssessmentsService } from './application/assessments.service'
import { LegacyAdminLogAdapter } from './infrastructure/admin-log.adapter'
import { LegacyAssessmentsAdapter } from './infrastructure/legacy-assessments.adapter'

interface AssessmentsModule {
  service: AssessmentsService
  adminLog: LegacyAdminLogAdapter
}

let moduleInstance: AssessmentsModule | null = null

export const getAssessmentsModule = (): AssessmentsModule => {
  if (moduleInstance) return moduleInstance

  moduleInstance = {
    adminLog: new LegacyAdminLogAdapter(),
    service: new AssessmentsService({
      backend: new LegacyAssessmentsAdapter()
    })
  }

  return moduleInstance
}
