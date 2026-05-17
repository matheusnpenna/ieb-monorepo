import { defineEventHandler } from 'h3'
import { handleAccountPasswordChange } from '../../../modules/auth/interfaces/http/controller'

export default defineEventHandler(handleAccountPasswordChange)
