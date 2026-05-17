import { defineEventHandler } from 'h3'
import { handleListAccountAssessmentAttempts } from '../../../modules/assessments/interfaces/http/controller'

export default defineEventHandler(handleListAccountAssessmentAttempts)
