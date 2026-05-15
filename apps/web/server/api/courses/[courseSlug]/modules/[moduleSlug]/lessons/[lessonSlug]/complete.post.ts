import { defineEventHandler } from 'h3'
import { handleMarkLessonCompleted } from '../../../../../../../modules/lessons/interfaces/http/controller'

export default defineEventHandler(handleMarkLessonCompleted)
