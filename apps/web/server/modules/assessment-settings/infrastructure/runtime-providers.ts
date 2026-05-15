import type { AssessmentSettingsClock } from '../application/ports'

export class SystemAssessmentSettingsClock implements AssessmentSettingsClock {
  now() {
    return new Date().toISOString()
  }
}
