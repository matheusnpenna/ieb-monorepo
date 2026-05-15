import { defineEventHandler } from 'h3'
import { handleLogout } from '../../modules/auth/interfaces/http/controller'

export default defineEventHandler(handleLogout)
