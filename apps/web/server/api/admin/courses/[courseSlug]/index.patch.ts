import { defineEventHandler } from 'h3'
import { handleUpdateAdminCourse } from '../../../../modules/courses/interfaces/http/controller'

export default defineEventHandler(handleUpdateAdminCourse)
