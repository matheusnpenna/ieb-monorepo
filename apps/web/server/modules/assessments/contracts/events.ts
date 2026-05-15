export interface AssessmentChangedEvent {
  type: 'assessments.created' | 'assessments.updated' | 'assessments.deleted'
  assessmentId: string
  actorUserId: string
  occurredAt: string
}
