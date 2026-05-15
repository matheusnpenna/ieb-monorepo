import { defineEventHandler } from 'h3'
import { handlePasswordRecovery } from '../../modules/auth/interfaces/http/controller'

export default defineEventHandler(handlePasswordRecovery)
