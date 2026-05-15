import { defineEventHandler } from 'h3'
import { handleRegister } from '../../modules/auth/interfaces/http/controller'

export default defineEventHandler(handleRegister)
