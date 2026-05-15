import type { AdminModuleInput, CourseModule } from '@ieb/shared'
import { assertAdminModulePayload } from './validation'

export const buildAdminModulePayload = (
  input: AdminModuleInput,
  actorUserId: string,
  options: {
    courseId: string
    existingModule?: CourseModule | null
    resolvedSlug?: string
  }
): CourseModule => {
  const existingModule = options.existingModule || null
  const now = new Date().toISOString()
  const normalizedPayload = assertAdminModulePayload(input, {
    existingModule,
    resolvedSlug: options.resolvedSlug
  })

  return {
    id: normalizedPayload.slug,
    courseId: options.courseId,
    title: input.title.trim(),
    slug: normalizedPayload.slug,
    description: input.description.trim(),
    order: Math.max(1, Math.floor(input.order)),
    lessonIds: existingModule?.lessonIds || [],
    assessmentIds: existingModule?.assessmentIds || [],
    estimatedDurationInMinutes: Math.max(0, Math.floor(input.estimatedDurationInMinutes)),
    createdAt: existingModule?.createdAt || now,
    updatedAt: now,
    deletedAt: existingModule?.deletedAt ?? null,
    createdBy: existingModule?.createdBy || actorUserId,
    updatedBy: actorUserId,
    deletedBy: existingModule?.deletedBy ?? null
  }
}
