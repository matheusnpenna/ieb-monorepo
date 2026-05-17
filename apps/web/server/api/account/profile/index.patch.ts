import { defineEventHandler } from 'h3'
import { handleUpdateAccountProfile } from '../../../modules/users/interfaces/http/controller'

export default defineEventHandler(handleUpdateAccountProfile)
