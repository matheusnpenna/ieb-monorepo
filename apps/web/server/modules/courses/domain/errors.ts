export class CourseError extends Error {
  statusCode: number
  statusMessage: string

  constructor(statusCode: number, statusMessage: string) {
    super(statusMessage)
    this.name = 'CourseError'
    this.statusCode = statusCode
    this.statusMessage = statusMessage
  }
}

export const createCourseError = (statusCode: number, statusMessage: string) =>
  new CourseError(statusCode, statusMessage)
