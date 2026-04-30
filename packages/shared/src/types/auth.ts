import type { TimestampValue, UserRegion, UserRole, UserStatus } from './database'

export interface AuthSessionUser {
  id: string
  email: string
  fullName: string
  role: UserRole
  status: UserStatus
  region: UserRegion
  avatarUrl: string | null
}

export interface AuthSessionResponse {
  authenticated: boolean
  user: AuthSessionUser | null
}

export interface AuthSuccessResponse {
  user: AuthSessionUser
}

export interface RegistrationStatusResponse {
  isOpen: boolean
  message: string
  classroomName: string | null
}

export interface AuthSessionContext {
  user: AuthSessionUser
  issuedAt: TimestampValue
}
