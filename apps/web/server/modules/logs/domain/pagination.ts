import type { AdminActivityLog } from '@ieb/shared'
import { createLogsError } from './errors'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 50

export const normalizeLogsPageSize = (value?: number | null) => {
  if (!value || Number.isNaN(value)) {
    return DEFAULT_PAGE_SIZE
  }

  return Math.min(Math.max(Math.trunc(value), 1), MAX_PAGE_SIZE)
}

export const encodeLogsCursor = (log: AdminActivityLog) =>
  Buffer.from(
    JSON.stringify({
      createdAt: log.createdAt
    }),
    'utf-8'
  ).toString('base64url')

export const decodeLogsCursor = (cursor: string) => {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8')) as {
      createdAt?: string
    }

    if (!parsed.createdAt) {
      throw new Error('invalid-cursor')
    }

    return {
      createdAt: parsed.createdAt
    }
  } catch {
    throw createLogsError(400, 'Informe um cursor de paginacao valido.')
  }
}
