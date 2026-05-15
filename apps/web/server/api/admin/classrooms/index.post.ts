import { defineEventHandler } from 'h3'
import { handleCreateAdminClassroom } from '../../../modules/classrooms/interfaces/http/controller'

export default defineEventHandler(handleCreateAdminClassroom)
