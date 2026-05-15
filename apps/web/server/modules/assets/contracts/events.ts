import type { AdminImageField } from '../domain/validation'

export interface AdminImageUploadedEvent {
  type: 'assets.admin-image-uploaded'
  field: AdminImageField
  path: string
  url: string
  actorUserId: string
  occurredAt: string
}
