import { defineEventHandler } from 'h3'
import { handleListAdminHighlights } from '../../../modules/highlights/interfaces/http/controller'

export default defineEventHandler(handleListAdminHighlights)
