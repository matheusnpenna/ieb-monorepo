import { createError } from 'h3'

export const createAssessmentSettingsError = (statusCode: number, statusMessage: string) =>
  createError({
    statusCode,
    statusMessage
  })
