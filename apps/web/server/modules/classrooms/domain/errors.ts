import { createError } from 'h3'

export const createClassroomError = (statusCode: number, statusMessage: string) =>
  createError({
    statusCode,
    statusMessage
  })
