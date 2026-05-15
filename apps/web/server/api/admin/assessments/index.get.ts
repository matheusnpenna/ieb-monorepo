import { defineEventHandler } from 'h3'
import { handleListAdminAssessments } from '../../../modules/assessments/interfaces/http/controller'

export default defineEventHandler(handleListAdminAssessments)
