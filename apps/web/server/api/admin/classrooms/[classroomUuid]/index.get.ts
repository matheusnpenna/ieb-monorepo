import { defineEventHandler } from 'h3'
import { handleGetAdminClassroom } from '../../../../modules/classrooms/interfaces/http/controller'

export default defineEventHandler(handleGetAdminClassroom)
