import { defineEventHandler } from 'h3'
import { handleDeleteAdminClassroom } from '../../../../modules/classrooms/interfaces/http/controller'

export default defineEventHandler(handleDeleteAdminClassroom)
