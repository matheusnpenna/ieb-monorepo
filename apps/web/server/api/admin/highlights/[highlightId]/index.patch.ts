import { defineEventHandler } from 'h3'
import { handleUpdateAdminHighlight } from '../../../../modules/highlights/interfaces/http/controller'

export default defineEventHandler(handleUpdateAdminHighlight)
