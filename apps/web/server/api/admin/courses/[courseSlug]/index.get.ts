import { defineEventHandler } from 'h3'
import { handleGetAdminCourse } from '../../../../modules/courses/interfaces/http/controller'

export default defineEventHandler(handleGetAdminCourse)
