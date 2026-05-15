import { defineEventHandler } from 'h3'
import { handleListAccessibleCourses } from '../../modules/courses/interfaces/http/controller'

export default defineEventHandler(handleListAccessibleCourses)
