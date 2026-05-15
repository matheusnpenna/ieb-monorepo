export interface AssessmentSettingsUpdatedEvent {
  type: 'assessment-settings.updated'
  settingsId: string
  maxAttemptsPerAssessment: number
  actorUserId: string
  occurredAt: string
}
