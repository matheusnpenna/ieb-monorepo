import { createError } from 'h3'

export const createAuthError = (statusCode: number, statusMessage: string) =>
  createError({
    statusCode,
    statusMessage
  })
