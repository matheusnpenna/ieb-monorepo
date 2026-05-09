import type { AdminActivityLog, AdminLogsData, AuthSessionContext } from '@ieb/shared'
import { createError } from 'h3'
import { getFirebaseAdminCollection } from './firebase-admin'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 50

const createHttpError = (statusCode: number, statusMessage: string) =>
  createError({
    statusCode,
    statusMessage
  })

const toAdminLogDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    id: snapshot.id,
    ...(snapshot.data() as Omit<AdminActivityLog, 'id'>)
  }) as AdminActivityLog

const encodeCursor = (log: AdminActivityLog) =>
  Buffer.from(
    JSON.stringify({
      createdAt: log.createdAt
    }),
    'utf-8'
  ).toString('base64url')

const decodeCursor = (cursor: string) => {
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
    throw createHttpError(400, 'Informe um cursor de paginacao valido.')
  }
}

const normalizePageSize = (value?: number | null) => {
  if (!value || Number.isNaN(value)) {
    return DEFAULT_PAGE_SIZE
  }

  return Math.min(Math.max(Math.trunc(value), 1), MAX_PAGE_SIZE)
}

export const listAdminLogsForManagement = async (
  session: AuthSessionContext,
  input?: {
    cursor?: string | null
    pageSize?: number | null
  }
): Promise<AdminLogsData> => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const pageSize = normalizePageSize(input?.pageSize)
  const decodedCursor = input?.cursor?.trim() ? decodeCursor(input.cursor.trim()) : null
  let query = getFirebaseAdminCollection('adminLogs').orderBy('createdAt', 'desc').limit(pageSize + 1)

  if (decodedCursor) {
    query = query.startAfter(decodedCursor.createdAt)
  }

  const snapshot = await query.get()
  const logs = snapshot.docs
    .map(toAdminLogDocument)
    .filter((log) => !log.deletedAt)

  const items = logs.slice(0, pageSize)
  const nextCursor = logs.length > pageSize && items.length > 0 ? encodeCursor(items[items.length - 1]!) : null

  return {
    items,
    pagination: {
      nextCursor,
      pageSize
    }
  }
}
