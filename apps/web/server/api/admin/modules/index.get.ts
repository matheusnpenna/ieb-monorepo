import { defineEventHandler } from 'h3'
import { handleListAdminModules } from '../../../modules/course-modules/interfaces/http/controller'

export default defineEventHandler(handleListAdminModules)
