import { AssessmentSettingsService } from './application/assessment-settings.service'
import { AdminLogAdapter } from './infrastructure/admin-log.adapter'
import { FirebaseAssessmentSettingsRepository } from './infrastructure/firebase-assessment-settings.repository'
import { SystemAssessmentSettingsClock } from './infrastructure/runtime-providers'

interface AssessmentSettingsModule {
  service: AssessmentSettingsService
  adminLog: AdminLogAdapter
}

let moduleInstance: AssessmentSettingsModule | null = null

export const getAssessmentSettingsModule = (): AssessmentSettingsModule => {
  if (moduleInstance) {
    return moduleInstance
  }

  const adminLog = new AdminLogAdapter()

  moduleInstance = {
    adminLog,
    service: new AssessmentSettingsService({
      repository: new FirebaseAssessmentSettingsRepository(),
      adminLog,
      clock: new SystemAssessmentSettingsClock()
    })
  }

  return moduleInstance
}
