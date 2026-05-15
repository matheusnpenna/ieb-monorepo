import { defineEventHandler } from 'h3'
import { handleCreateAdminCourse } from '../../../modules/courses/interfaces/http/controller'

export default defineEventHandler(handleCreateAdminCourse)
