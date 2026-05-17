import { defineEventHandler } from 'h3'
import { handleGetAccountProfile } from '../../../modules/users/interfaces/http/controller'

export default defineEventHandler(handleGetAccountProfile)
