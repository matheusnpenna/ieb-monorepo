import type { AdminClassroomInput, AuthSessionContext } from '@ieb/shared'
import { getClassroomsModule } from '../modules/classrooms/classrooms.module'

export const listAdminClassroomsForManagement = async (session: AuthSessionContext) =>
  await getClassroomsModule().service.listAdminClassroomsForManagement(session)

export const getAdminClassroomByUuid = async (session: AuthSessionContext, classroomUuid: string) =>
  await getClassroomsModule().service.getAdminClassroomByUuid(session, classroomUuid)

export const createAdminClassroom = async (session: AuthSessionContext, input: AdminClassroomInput) =>
  await getClassroomsModule().service.createAdminClassroom(session, input)

export const updateAdminClassroomByUuid = async (
  session: AuthSessionContext,
  classroomUuid: string,
  input: AdminClassroomInput
) => await getClassroomsModule().service.updateAdminClassroomByUuid(session, classroomUuid, input)

export const deleteAdminClassroomByUuid = async (session: AuthSessionContext, classroomUuid: string) =>
  await getClassroomsModule().service.deleteAdminClassroomByUuid(session, classroomUuid)
