import { defineEventHandler } from 'h3'
import { handleDeleteAdminCourse } from '../../../../modules/courses/interfaces/http/controller'

export default defineEventHandler(handleDeleteAdminCourse)
