import type { AdminActionType, AuthSessionContext, Classroom, User } from '@ieb/shared'

export interface RegisterAccountInput {
  fullName: string
  cpf: string
  email: string
  password: string
  phone: string | null
  region: User['region']
}

export interface IdentityAuthenticatedUser {
  idToken: string
  uid: string
  email: string
}

export interface IdentityPasswordUpdateResult {
  idToken: string
  uid: string
  email: string
}

export interface IdentityUserRecord {
  uid: string
  email?: string | null
  displayName?: string | null
}

export interface IdentitySessionRecord {
  uid: string
  email?: string
}

export interface IdentityProvider {
  signInWithEmailAndPassword(input: {
    email: string
    password: string
  }): Promise<IdentityAuthenticatedUser>
  signUpWithEmailAndPassword(input: {
    email: string
    password: string
  }): Promise<IdentityAuthenticatedUser>
  sendPasswordRecoveryEmail(email: string): Promise<void>
  updatePasswordWithIdToken(input: {
    idToken: string
    password: string
  }): Promise<IdentityPasswordUpdateResult>
  createSessionCookie(idToken: string, options: { expiresIn: number }): Promise<string>
  verifySessionCookie(sessionCookie: string): Promise<IdentitySessionRecord>
  getUser(uid: string): Promise<IdentityUserRecord>
  deleteUser(uid: string): Promise<void>
}

export interface AuthUserRepository {
  findById(uid: string): Promise<User | null>
  findActiveByCpf(cpf: string): Promise<User | null>
  save(user: User): Promise<void>
  update(uid: string, payload: Partial<User>): Promise<void>
}

export interface AuthClassroomRepository {
  findByUuid(classroomUuid: string): Promise<Classroom | null>
}

export type WriteAdminLogInput =
  | {
      action: AdminActionType
      targetCollection: string
      targetId: string
      summary: string
      metadata?: Record<string, unknown>
    }
  | 'login'
  | 'logout'

export interface AdminLogRepository {
  write(session: AuthSessionContext, input: WriteAdminLogInput, summary?: string): Promise<void>
}

export interface AuthClock {
  now(): string
}
