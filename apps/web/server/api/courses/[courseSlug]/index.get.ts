import { defineEventHandler } from 'h3'
import { handleGetAccessibleCourseDetail } from '../../../modules/courses/interfaces/http/controller'

export default defineEventHandler(handleGetAccessibleCourseDetail)
