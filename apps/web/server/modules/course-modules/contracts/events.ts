export interface CourseModuleChangedEvent {
  type: 'course-modules.created' | 'course-modules.updated' | 'course-modules.deleted'
  moduleId: string
  actorUserId: string
  occurredAt: string
}
