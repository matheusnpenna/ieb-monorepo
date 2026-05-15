import { defineEventHandler } from 'h3'
import { handleGetAdminHighlight } from '../../../../modules/highlights/interfaces/http/controller'

export default defineEventHandler(handleGetAdminHighlight)
