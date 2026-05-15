import { defineEventHandler } from 'h3'
import { handleCreateAdminHighlight } from '../../../modules/highlights/interfaces/http/controller'

export default defineEventHandler(handleCreateAdminHighlight)
