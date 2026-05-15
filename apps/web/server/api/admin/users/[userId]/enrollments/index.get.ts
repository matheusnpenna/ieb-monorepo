import { defineEventHandler } from 'h3'
import { handleListAdminUserEnrollments } from '../../../../../modules/users/interfaces/http/controller'

export default defineEventHandler(handleListAdminUserEnrollments)
