import { defineEventHandler } from 'h3'
import { handleListAdminLogs } from '../../../modules/logs/interfaces/http/controller'

export default defineEventHandler(handleListAdminLogs)
