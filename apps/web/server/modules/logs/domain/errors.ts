import { createError } from 'h3'

export const createLogsError = (statusCode: number, statusMessage: string) =>
  createError({
    statusCode,
    statusMessage
  })
