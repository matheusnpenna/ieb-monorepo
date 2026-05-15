import type { AdminHighlightInput, AuthSessionContext } from '@ieb/shared'
import { getHighlightsModule } from '../modules/highlights/highlights.module'

export const listAdminHighlightsForManagement = async (session: AuthSessionContext) =>
  await getHighlightsModule().service.listAdminHighlightsForManagement(session)

export const getAdminHighlightById = async (session: AuthSessionContext, highlightId: string) =>
  await getHighlightsModule().service.getAdminHighlightById(session, highlightId)

export const createAdminHighlight = async (session: AuthSessionContext, input: AdminHighlightInput) =>
  await getHighlightsModule().service.createAdminHighlight(session, input)

export const updateAdminHighlightById = async (
  session: AuthSessionContext,
  highlightId: string,
  input: AdminHighlightInput
) => await getHighlightsModule().service.updateAdminHighlightById(session, highlightId, input)

export const deleteAdminHighlightById = async (session: AuthSessionContext, highlightId: string) =>
  await getHighlightsModule().service.deleteAdminHighlightById(session, highlightId)

export const listActiveHomeHighlights = async (session: AuthSessionContext) =>
  await getHighlightsModule().service.listActiveHomeHighlights(session)
