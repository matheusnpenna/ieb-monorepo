import { defineEventHandler } from 'h3'
import { handleCreateAdminModule } from '../../../modules/course-modules/interfaces/http/controller'

export default defineEventHandler(handleCreateAdminModule)
