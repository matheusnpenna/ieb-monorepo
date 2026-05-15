import { defineEventHandler } from 'h3'
import { handleListLessonComments } from '../../../../../../../../modules/lessons/interfaces/http/controller'

export default defineEventHandler(handleListLessonComments)
