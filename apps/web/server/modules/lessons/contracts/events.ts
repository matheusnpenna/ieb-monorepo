export interface LessonChangedEvent {
  type: 'lessons.created' | 'lessons.updated' | 'lessons.deleted'
  lessonId: string
  actorUserId: string
  occurredAt: string
}
