import { defineEventHandler } from 'h3'
import { handleGetAdminUser } from '../../../../modules/users/interfaces/http/controller'

export default defineEventHandler(handleGetAdminUser)
