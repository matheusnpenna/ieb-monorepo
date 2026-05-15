import { defineEventHandler } from 'h3'
import { handleGetAdminAssessmentSettings } from '../../../../modules/assessment-settings/interfaces/http/controller'

export default defineEventHandler(handleGetAdminAssessmentSettings)
