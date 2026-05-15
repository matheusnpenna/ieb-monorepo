import { defineEventHandler } from 'h3'
import { handleUpdateAdminAssessmentSettings } from '../../../../modules/assessment-settings/interfaces/http/controller'

export default defineEventHandler(handleUpdateAdminAssessmentSettings)
