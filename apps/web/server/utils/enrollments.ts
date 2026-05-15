import type {
  AdminUserEnrollmentsData,
  AdminUserEnrollmentsInput,
  AuthSessionContext
} from '@ieb/shared'
import { getUsersModule } from '../modules/users/users.module'

export const listAdminUserEnrollments = async (
  session: AuthSessionContext,
  userId: string
): Promise<AdminUserEnrollmentsData> => {
  return await getUsersModule().userEnrollmentsService.listAdminUserEnrollments(session, userId)
}

export const updateAdminUserEnrollments = async (
  session: AuthSessionContext,
  userId: string,
  input: AdminUserEnrollmentsInput
): Promise<AdminUserEnrollmentsData> => {
  return await getUsersModule().userEnrollmentsService.updateAdminUserEnrollments(session, userId, input)
}
