import type { AdminCourseInput, Course } from '@ieb/shared'
import { assertAdminCoursePayload, normalizeOptionalText } from './validation'

export const buildAdminCoursePayload = (
  input: AdminCourseInput,
  actorUserId: string,
  options?: { existingCourse?: Course | null; resolvedSlug?: string }
): Course => {
  const existingCourse = options?.existingCourse || null
  const now = new Date().toISOString()
  const normalizedSlug = assertAdminCoursePayload(input, {
    currentCourseSlug: existingCourse?.slug,
    resolvedSlug: options?.resolvedSlug
  })

  return {
    id: normalizedSlug,
    title: input.title.trim(),
    slug: normalizedSlug,
    shortDescription: input.shortDescription.trim(),
    description: input.description.trim(),
    visibility: input.visibility,
    coverImageUrl: normalizeOptionalText(input.coverImageUrl),
    heroImageUrl: normalizeOptionalText(input.heroImageUrl),
    totalDurationInMinutes: Math.max(0, Math.floor(input.totalDurationInMinutes)),
    moduleIds: existingCourse?.moduleIds || [],
    highlightIds: existingCourse?.highlightIds || [],
    requiredCompletionRate: Math.min(100, Math.max(0, Math.floor(input.requiredCompletionRate))),
    certificateEnabled: Boolean(input.certificateEnabled),
    createdAt: existingCourse?.createdAt || now,
    updatedAt: now,
    deletedAt: existingCourse?.deletedAt ?? null,
    createdBy: existingCourse?.createdBy || actorUserId,
    updatedBy: actorUserId,
    deletedBy: existingCourse?.deletedBy ?? null
  }
}
