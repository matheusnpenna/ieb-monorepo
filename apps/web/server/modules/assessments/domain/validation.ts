import type { AdminAssessmentInput, Assessment } from '@ieb/shared'
import { createAssessmentError } from './errors'

const COURSE_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const normalizeOptionalText = (value: string | null | undefined) => {
  const normalizedValue = typeof value === 'string' ? value.trim() : ''

  return normalizedValue ? normalizedValue : null
}

export const normalizeCourseSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

export const createFourDigitSlugHash = (value: string, salt = 0) => {
  const normalizedValue = `${value}:${salt}`
  let hash = 0

  for (let index = 0; index < normalizedValue.length; index += 1) {
    hash = (hash * 31 + normalizedValue.charCodeAt(index)) % 9000
  }

  return String(hash + 1000)
}

export const assertAdminAssessmentPayload = (
  input: AdminAssessmentInput,
  options?: {
    existingAssessment?: Assessment | null
    resolvedSlug?: string
  }
) => {
  const existingAssessment = options?.existingAssessment || null
  const requestedCourseId = input.courseId.trim()
  const requestedModuleId = input.moduleId.trim()
  const normalizedSlug = normalizeCourseSlug(options?.resolvedSlug || input.slug || input.title)

  if (!requestedCourseId) {
    throw createAssessmentError(400, 'Selecione um curso valido para a avaliacao.')
  }

  if (!requestedModuleId) {
    throw createAssessmentError(400, 'Selecione um modulo valido para a avaliacao.')
  }

  if (existingAssessment && requestedCourseId !== existingAssessment.courseId) {
    throw createAssessmentError(400, 'O curso da avaliacao nao pode ser alterado apos a criacao.')
  }

  if (existingAssessment && requestedModuleId !== existingAssessment.moduleId) {
    throw createAssessmentError(400, 'O modulo da avaliacao nao pode ser alterado apos a criacao.')
  }

  if (!input.title.trim()) {
    throw createAssessmentError(400, 'Informe o titulo da avaliacao.')
  }

  if (!normalizedSlug || !COURSE_SLUG_REGEX.test(normalizedSlug)) {
    throw createAssessmentError(400, 'Informe um slug de avaliacao valido.')
  }

  if (existingAssessment && normalizedSlug !== existingAssessment.slug) {
    throw createAssessmentError(400, 'O slug da avaliacao nao pode ser alterado apos a criacao.')
  }

  if (!input.description.trim()) {
    throw createAssessmentError(400, 'Informe a descricao da avaliacao.')
  }

  if (!['multiple_choice', 'free_text'].includes(input.questionType)) {
    throw createAssessmentError(400, 'Informe um tipo de questao valido para a avaliacao.')
  }

  if (!Number.isFinite(input.passingScore) || input.passingScore < 0 || input.passingScore > 100) {
    throw createAssessmentError(400, 'Informe uma nota minima entre 0 e 100 para a avaliacao.')
  }

  if (
    input.timeLimitInMinutes !== null &&
    (!Number.isFinite(input.timeLimitInMinutes) || Number(input.timeLimitInMinutes) <= 0)
  ) {
    throw createAssessmentError(400, 'Informe um tempo limite valido para a avaliacao.')
  }

  if (!Array.isArray(input.questions) || input.questions.length === 0) {
    throw createAssessmentError(400, 'Cadastre pelo menos uma questao na avaliacao.')
  }

  const normalizedQuestionIds = new Set<string>()

  for (const question of input.questions) {
    const normalizedPrompt = question.prompt?.trim?.() || ''

    if (!question.id || normalizedQuestionIds.has(question.id)) {
      throw createAssessmentError(400, 'Cada questao da avaliacao precisa ter um identificador unico.')
    }

    normalizedQuestionIds.add(question.id)

    if (!normalizedPrompt) {
      throw createAssessmentError(400, 'Todas as questoes da avaliacao precisam ter um enunciado.')
    }

    if (input.questionType === 'multiple_choice') {
      if (!Array.isArray(question.options) || question.options.length < 2) {
        throw createAssessmentError(400, 'Questoes de multipla escolha precisam ter ao menos duas alternativas.')
      }

      const correctOptions = question.options.filter((option) => option.isCorrect)

      if (correctOptions.length !== 1) {
        throw createAssessmentError(400, 'Cada questao de multipla escolha precisa ter exatamente uma alternativa correta.')
      }

      const optionIds = new Set<string>()

      for (const option of question.options) {
        if (!option.id || optionIds.has(option.id)) {
          throw createAssessmentError(400, 'Cada alternativa precisa ter um identificador unico.')
        }

        optionIds.add(option.id)

        if (!option.label.trim()) {
          throw createAssessmentError(400, 'Todas as alternativas precisam ter um texto.')
        }
      }
    }

    if (input.questionType === 'free_text' && question.options.length > 0) {
      throw createAssessmentError(400, 'Questoes abertas nao podem possuir alternativas cadastradas.')
    }
  }

  return {
    courseId: requestedCourseId,
    moduleId: requestedModuleId,
    slug: normalizedSlug
  }
}
