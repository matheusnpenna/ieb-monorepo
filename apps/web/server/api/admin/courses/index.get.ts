import { defineEventHandler } from 'h3'
import { handleListAdminCourses } from '../../../modules/courses/interfaces/http/controller'

export default defineEventHandler(handleListAdminCourses)
