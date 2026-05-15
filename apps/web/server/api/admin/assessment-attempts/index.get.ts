import { defineEventHandler } from 'h3'
import { handleListAdminAssessmentAttempts } from '../../../modules/assessments/interfaces/http/controller'

export default defineEventHandler(handleListAdminAssessmentAttempts)
