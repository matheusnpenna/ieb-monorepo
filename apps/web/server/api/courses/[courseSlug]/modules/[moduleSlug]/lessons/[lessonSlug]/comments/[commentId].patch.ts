import { defineEventHandler } from 'h3'
import { handleUpdateLessonComment } from '../../../../../../../../modules/lessons/interfaces/http/controller'

export default defineEventHandler(handleUpdateLessonComment)
