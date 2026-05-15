import { defineEventHandler } from 'h3'
import { handleGetAdminLesson } from '../../../../modules/lessons/interfaces/http/controller'

export default defineEventHandler(handleGetAdminLesson)
