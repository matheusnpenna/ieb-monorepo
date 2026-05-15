import type { Assessment, AssessmentAttempt, StudentAssessmentItem, StudentModuleAssessmentData } from '@ieb/shared'

const buildStudentAssessmentAttemptPreview = (attempt: AssessmentAttempt | null) => {
  if (!attempt) {
    return null
  }

  return {
    id: attempt.id,
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    score: attempt.score,
    approved: attempt.approved,
    submittedAt: attempt.submittedAt
  }
}

const buildStudentAssessmentAvailability = (
  assessment: Assessment,
  attempts: AssessmentAttempt[],
  maxAttemptsPerAssessment: number
) => {
  const orderedAttempts = [...attempts].sort((left, right) => right.attemptNumber - left.attemptNumber)
  const latestAttempt = orderedAttempts[0] || null
  const attemptsUsed = attempts.length
  const attemptsRemaining = Math.max(maxAttemptsPerAssessment - attemptsUsed, 0)

  if (assessment.questionType === 'free_text' && latestAttempt?.status === 'pending_review') {
    return {
      availability: 'blocked_pending_review' as const,
      blockingMessage: 'Sua ultima tentativa ainda esta aguardando correcao manual.',
      attemptsUsed,
      attemptsRemaining,
      latestAttempt: buildStudentAssessmentAttemptPreview(latestAttempt)
    }
  }

  if (attemptsUsed >= maxAttemptsPerAssessment) {
    return {
      availability: 'blocked_attempt_limit' as const,
      blockingMessage: 'Voce atingiu o limite maximo de tentativas para esta avaliacao.',
      attemptsUsed,
      attemptsRemaining,
      latestAttempt: buildStudentAssessmentAttemptPreview(latestAttempt)
    }
  }

  return {
    availability: 'available' as const,
    blockingMessage: null,
    attemptsUsed,
    attemptsRemaining,
    latestAttempt: buildStudentAssessmentAttemptPreview(latestAttempt)
  }
}

export const sanitizeAssessmentForStudent = (
  assessment: Assessment,
  attempts: AssessmentAttempt[],
  maxAttemptsPerAssessment: number
): StudentAssessmentItem => {
  const availability = buildStudentAssessmentAvailability(assessment, attempts, maxAttemptsPerAssessment)

  return {
    id: assessment.id,
    slug: assessment.slug,
    title: assessment.title,
    description: assessment.description,
    questionType: assessment.questionType,
    passingScore: assessment.passingScore,
    timeLimitInMinutes: assessment.timeLimitInMinutes,
    questionCount: assessment.questions.length,
    availability: availability.availability,
    blockingMessage: availability.blockingMessage,
    attemptsUsed: availability.attemptsUsed,
    attemptsRemaining: availability.attemptsRemaining,
    maxAttempts: maxAttemptsPerAssessment,
    latestAttempt: availability.latestAttempt,
    questions: assessment.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: question.options.map((option) => ({
        id: option.id,
        label: option.label
      }))
    }))
  }
}

export const buildStudentModuleAssessmentData = (input: {
  assessments: Assessment[]
  attempts: AssessmentAttempt[]
  maxAttemptsPerAssessment: number
  progress: StudentModuleAssessmentData['progress']
}): StudentModuleAssessmentData => {
  if (input.assessments.length === 0) {
    return {
      availability: 'not_created',
      message: 'Este modulo ainda nao possui avaliacao cadastrada.',
      assessments: [],
      progress: input.progress
    }
  }

  if (input.progress.totalLessons > 0 && input.progress.completedLessons < input.progress.totalLessons) {
    return {
      availability: 'blocked_incomplete_lessons',
      message: 'Finalize todas as aulas do modulo para liberar as avaliacoes.',
      assessments: [],
      progress: input.progress
    }
  }

  return {
    availability: 'available',
    message:
      input.assessments.length === 1
        ? 'A avaliacao deste modulo ja esta disponivel.'
        : 'As avaliacoes deste modulo ja estao disponiveis.',
    assessments: input.assessments.map((assessment) =>
      sanitizeAssessmentForStudent(
        assessment,
        input.attempts.filter((attempt) => attempt.assessmentId === assessment.id),
        input.maxAttemptsPerAssessment
      )
    ),
    progress: input.progress
  }
}
