import { createError } from 'h3'

export const createUserError = (statusCode: number, statusMessage: string) =>
  createError({
    statusCode,
    statusMessage
  })
