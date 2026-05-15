import { createError } from 'h3'

export const createAssetError = (statusCode: number, statusMessage: string) =>
  createError({
    statusCode,
    statusMessage
  })
