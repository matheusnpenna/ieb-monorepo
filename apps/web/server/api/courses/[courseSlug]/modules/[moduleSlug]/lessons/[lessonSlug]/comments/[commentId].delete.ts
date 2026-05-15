import { defineEventHandler } from 'h3'
import { handleDeleteLessonComment } from '../../../../../../../../modules/lessons/interfaces/http/controller'

export default defineEventHandler(handleDeleteLessonComment)
