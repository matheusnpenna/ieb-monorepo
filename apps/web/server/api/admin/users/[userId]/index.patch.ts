import { defineEventHandler } from 'h3'
import { handleUpdateAdminUser } from '../../../../modules/users/interfaces/http/controller'

export default defineEventHandler(handleUpdateAdminUser)
