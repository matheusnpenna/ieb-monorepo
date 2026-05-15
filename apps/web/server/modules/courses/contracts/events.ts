export interface CourseChangedEvent {
  type: 'courses.created' | 'courses.updated' | 'courses.deleted'
  courseId: string
  actorUserId: string
  occurredAt: string
}
