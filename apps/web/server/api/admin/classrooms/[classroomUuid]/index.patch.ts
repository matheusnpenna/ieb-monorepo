import { defineEventHandler } from 'h3'
import { handleUpdateAdminClassroom } from '../../../../modules/classrooms/interfaces/http/controller'

export default defineEventHandler(handleUpdateAdminClassroom)
