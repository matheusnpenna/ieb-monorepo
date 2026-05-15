import { defineEventHandler } from 'h3'
import { handleGetAdminModule } from '../../../../modules/course-modules/interfaces/http/controller'

export default defineEventHandler(handleGetAdminModule)
