import type { AdminAssessmentInput, Assessment } from '@ieb/shared'
import { assertAdminAssessmentPayload, normalizeOptionalText } from './validation'

export const buildAdminAssessmentPayload = (
  input: AdminAssessmentInput,
  actorUserId: string,
  options: {
    courseId: string
    moduleId: string
    existingAssessment?: Assessment | null
    resolvedSlug?: string
  }
): Assessment => {
  const existingAssessment = options.existingAssessment || null
  const now = new Date().toISOString()
  const normalizedPayload = assertAdminAssessmentPayload(input, {
    existingAssessment,
    resolvedSlug: options.resolvedSlug
  })

  return {
    id: normalizedPayload.slug,
    courseId: options.courseId,
    moduleId: options.moduleId,
    title: input.title.trim(),
    slug: normalizedPayload.slug,
    description: input.description.trim(),
    questionType: input.questionType,
    passingScore: Math.min(100, Math.max(0, Math.floor(input.passingScore))),
    timeLimitInMinutes:
      input.timeLimitInMinutes === null ? null : Math.max(1, Math.floor(Number(input.timeLimitInMinutes))),
    questions: input.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt.trim(),
      explanation: normalizeOptionalText(question.explanation),
      options:
        input.questionType === 'multiple_choice'
          ? question.options.map((option) => ({
              id: option.id,
              label: option.label.trim(),
              isCorrect: Boolean(option.isCorrect)
            }))
          : []
    })),
    createdAt: existingAssessment?.createdAt || now,
    updatedAt: now,
    deletedAt: existingAssessment?.deletedAt ?? null,
    createdBy: existingAssessment?.createdBy || actorUserId,
    updatedBy: actorUserId,
    deletedBy: existingAssessment?.deletedBy ?? null
  }
}
