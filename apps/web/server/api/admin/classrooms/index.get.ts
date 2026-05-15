import { defineEventHandler } from 'h3'
import { handleListAdminClassrooms } from '../../../modules/classrooms/interfaces/http/controller'

export default defineEventHandler(handleListAdminClassrooms)
