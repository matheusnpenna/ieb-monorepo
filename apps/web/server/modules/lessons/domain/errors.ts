export class LessonError extends Error {
  statusCode: number
  statusMessage: string

  constructor(statusCode: number, statusMessage: string) {
    super(statusMessage)
    this.name = 'LessonError'
    this.statusCode = statusCode
    this.statusMessage = statusMessage
  }
}

export const createLessonError = (statusCode: number, statusMessage: string) =>
  new LessonError(statusCode, statusMessage)
