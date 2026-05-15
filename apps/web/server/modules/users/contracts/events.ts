export interface AdminUserChangedEvent {
  type: 'users.admin-user-created' | 'users.admin-user-updated' | 'users.admin-user-deleted'
  userId: string
  actorUserId: string
  occurredAt: string
}

export interface AdminUserEnrollmentsUpdatedEvent {
  type: 'users.admin-user-enrollments-updated'
  userId: string
  desiredCourseIds: string[]
  actorUserId: string
  occurredAt: string
}
