import type { AdminUserInput, AdminUsersData, AuthSessionContext, User } from '@ieb/shared'
import { getUsersModule } from '../modules/users/users.module'

export const listAdminUsersForManagement = async (
  session: AuthSessionContext,
  options?: {
    page?: number
    pageSize?: number
  }
): Promise<AdminUsersData> => {
  return await getUsersModule().usersService.listAdminUsersForManagement(session, options)
}

export const getAdminUserById = async (session: AuthSessionContext, userId: string): Promise<User> => {
  return await getUsersModule().usersService.getAdminUserById(session, userId)
}

export const createAdminUser = async (session: AuthSessionContext, input: AdminUserInput): Promise<User> => {
  return await getUsersModule().usersService.createAdminUser(session, input)
}

export const updateAdminUserById = async (session: AuthSessionContext, userId: string, input: AdminUserInput) => {
  return await getUsersModule().usersService.updateAdminUserById(session, userId, input)
}

export const deleteAdminUserById = async (session: AuthSessionContext, userId: string) => {
  return await getUsersModule().usersService.deleteAdminUserById(session, userId)
}
