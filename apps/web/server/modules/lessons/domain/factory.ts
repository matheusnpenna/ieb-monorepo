import type { AdminLessonInput, Lesson } from '@ieb/shared'
import { assertAdminLessonPayload, normalizeOptionalText } from './validation'

export const buildAdminLessonPayload = (
  input: AdminLessonInput,
  actorUserId: string,
  options: {
    courseId: string
    moduleId: string
    existingLesson?: Lesson | null
    resolvedSlug?: string
  }
): Lesson => {
  const existingLesson = options.existingLesson || null
  const now = new Date().toISOString()
  const normalizedPayload = assertAdminLessonPayload(input, {
    existingLesson,
    resolvedSlug: options.resolvedSlug
  })

  return {
    id: normalizedPayload.slug,
    courseId: options.courseId,
    moduleId: options.moduleId,
    title: input.title.trim(),
    slug: normalizedPayload.slug,
    description: input.description.trim(),
    order: Math.max(1, Math.floor(input.order)),
    contentType: input.contentType,
    videoProvider: input.videoProvider ?? null,
    mediaUrl: normalizeOptionalText(input.mediaUrl),
    thumbnailUrl: normalizeOptionalText(input.thumbnailUrl),
    durationInMinutes: Math.max(0, Math.floor(input.durationInMinutes)),
    bodyContent: normalizeOptionalText(input.bodyContent),
    allowManualCompletion: Boolean(input.allowManualCompletion),
    createdAt: existingLesson?.createdAt || now,
    updatedAt: now,
    deletedAt: existingLesson?.deletedAt ?? null,
    createdBy: existingLesson?.createdBy || actorUserId,
    updatedBy: actorUserId,
    deletedBy: existingLesson?.deletedBy ?? null
  }
}
