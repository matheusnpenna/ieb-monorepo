export class AssessmentError extends Error {
  statusCode: number
  statusMessage: string

  constructor(statusCode: number, statusMessage: string) {
    super(statusMessage)
    this.name = 'AssessmentError'
    this.statusCode = statusCode
    this.statusMessage = statusMessage
  }
}

export const createAssessmentError = (statusCode: number, statusMessage: string) =>
  new AssessmentError(statusCode, statusMessage)
