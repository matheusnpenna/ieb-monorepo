import { defineEventHandler } from 'h3'
import { handleDeleteAdminUser } from '../../../../modules/users/interfaces/http/controller'

export default defineEventHandler(handleDeleteAdminUser)
