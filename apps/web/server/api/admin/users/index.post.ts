import { defineEventHandler } from 'h3'
import { handleCreateAdminUser } from '../../../modules/users/interfaces/http/controller'

export default defineEventHandler(handleCreateAdminUser)
