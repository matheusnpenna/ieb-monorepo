import { defineEventHandler } from 'h3'
import { handleCreateLessonComment } from '../../../../../../../../modules/lessons/interfaces/http/controller'

export default defineEventHandler(handleCreateLessonComment)
