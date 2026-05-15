import type { Assessment, AssessmentAttempt } from '@ieb/shared'
import { createAssessmentError } from './errors'

export const normalizeAssessmentAnswerText = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0]?.trim() || ''
  }

  return typeof value === 'string' ? value.trim() : ''
}

export const normalizeAssessmentAnswerOptions = (value: string | string[] | undefined) => {
  const rawValues = Array.isArray(value) ? value : typeof value === 'string' ? [value] : []

  return [...new Set(rawValues.map((item) => item.trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, 'pt-BR')
  )
}

export const normalizeAssessmentAnswers = (
  assessment: Assessment,
  answers: Record<string, string | string[]>
) =>
  assessment.questions.reduce<Record<string, string | string[]>>((accumulator, question) => {
    const providedValue = answers?.[question.id]

    if (assessment.questionType === 'multiple_choice') {
      const selectedOptionIds = normalizeAssessmentAnswerOptions(providedValue)

      if (selectedOptionIds.length === 0) {
        throw createAssessmentError(400, `Responda a questao "${question.prompt}".`)
      }

      const validOptionIds = new Set(question.options.map((option) => option.id))

      if (selectedOptionIds.some((optionId) => !validOptionIds.has(optionId))) {
        throw createAssessmentError(400, `Existe uma alternativa invalida na questao "${question.prompt}".`)
      }

      accumulator[question.id] = selectedOptionIds
      return accumulator
    }

    const responseText = normalizeAssessmentAnswerText(providedValue)

    if (!responseText) {
      throw createAssessmentError(400, `Responda a questao "${question.prompt}".`)
    }

    accumulator[question.id] = responseText
    return accumulator
  }, {})

export const gradeAssessmentAttempt = (
  assessment: Assessment,
  normalizedAnswers: Record<string, string | string[]>,
  now: string
): Pick<AssessmentAttempt, 'status' | 'score' | 'approved' | 'gradedAt' | 'gradedBy'> => {
  if (assessment.questionType !== 'multiple_choice') {
    return {
      status: 'pending_review',
      score: null,
      approved: null,
      gradedAt: null,
      gradedBy: null
    }
  }

  const correctQuestions = assessment.questions.filter((question) => {
    const expectedOptionIds = question.options
      .filter((option) => option.isCorrect)
      .map((option) => option.id)
      .sort((left, right) => left.localeCompare(right, 'pt-BR'))
    const providedOptionIds = normalizeAssessmentAnswerOptions(normalizedAnswers[question.id])

    return (
      expectedOptionIds.length === providedOptionIds.length &&
      expectedOptionIds.every((optionId, index) => optionId === providedOptionIds[index])
    )
  }).length

  const score = assessment.questions.length > 0 ? Math.round((correctQuestions / assessment.questions.length) * 100) : 0

  return {
    status: 'graded',
    score,
    approved: score >= assessment.passingScore,
    gradedAt: now,
    gradedBy: 'system:auto'
  }
}

export const buildManualAssessmentAttemptGrade = (
  assessment: Assessment,
  score: number,
  gradedAt: string,
  gradedBy: string
) => {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw createAssessmentError(400, 'Informe uma nota valida entre 0 e 100.')
  }

  const roundedScore = Math.round(score)

  return {
    status: 'graded' as const,
    score: roundedScore,
    approved: roundedScore >= assessment.passingScore,
    gradedAt,
    gradedBy
  }
}
