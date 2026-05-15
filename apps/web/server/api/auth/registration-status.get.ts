import { defineEventHandler } from 'h3'
import { handleRegistrationStatus } from '../../modules/auth/interfaces/http/controller'

export default defineEventHandler(handleRegistrationStatus)
