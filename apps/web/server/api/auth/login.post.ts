import { defineEventHandler } from 'h3'
import { handleLogin } from '../../modules/auth/interfaces/http/controller'

export default defineEventHandler(handleLogin)
