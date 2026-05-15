import { defineEventHandler } from 'h3'
import { handleUpdateAdminUserEnrollments } from '../../../../../modules/users/interfaces/http/controller'

export default defineEventHandler(handleUpdateAdminUserEnrollments)
