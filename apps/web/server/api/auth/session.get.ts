import { defineEventHandler } from 'h3'
import { handleSession } from '../../modules/auth/interfaces/http/controller'

export default defineEventHandler(handleSession)
