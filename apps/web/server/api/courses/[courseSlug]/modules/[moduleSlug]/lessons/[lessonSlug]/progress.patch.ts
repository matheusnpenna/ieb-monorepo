import { defineEventHandler } from 'h3'
import { handleUpdateLessonProgress } from '../../../../../../../modules/lessons/interfaces/http/controller'

export default defineEventHandler(handleUpdateLessonProgress)
