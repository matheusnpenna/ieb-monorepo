import { defineEventHandler } from 'h3'
import { handleListAdminUsers } from '../../../modules/users/interfaces/http/controller'

export default defineEventHandler(handleListAdminUsers)
