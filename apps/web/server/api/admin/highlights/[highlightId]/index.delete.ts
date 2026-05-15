import { defineEventHandler } from 'h3'
import { handleDeleteAdminHighlight } from '../../../../modules/highlights/interfaces/http/controller'

export default defineEventHandler(handleDeleteAdminHighlight)
