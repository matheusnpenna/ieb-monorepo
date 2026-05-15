export class CourseModuleError extends Error {
  statusCode: number
  statusMessage: string

  constructor(statusCode: number, statusMessage: string) {
    super(statusMessage)
    this.name = 'CourseModuleError'
    this.statusCode = statusCode
    this.statusMessage = statusMessage
  }
}

export const createCourseModuleError = (statusCode: number, statusMessage: string) =>
  new CourseModuleError(statusCode, statusMessage)
