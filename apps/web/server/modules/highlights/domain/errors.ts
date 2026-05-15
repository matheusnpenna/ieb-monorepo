export class HighlightError extends Error {
  statusCode: number
  statusMessage: string

  constructor(statusCode: number, statusMessage: string) {
    super(statusMessage)
    this.name = 'HighlightError'
    this.statusCode = statusCode
    this.statusMessage = statusMessage
  }
}

export const createHighlightError = (statusCode: number, statusMessage: string) =>
  new HighlightError(statusCode, statusMessage)
