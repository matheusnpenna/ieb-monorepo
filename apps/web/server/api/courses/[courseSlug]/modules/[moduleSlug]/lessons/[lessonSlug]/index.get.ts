import { defineEventHandler } from 'h3'
import { handleGetAccessibleLessonDetail } from '../../../../../../../modules/lessons/interfaces/http/controller'

export default defineEventHandler(handleGetAccessibleLessonDetail)
