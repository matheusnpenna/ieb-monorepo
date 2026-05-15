import { AdminLogService } from './application/admin-log.service'
import { AuthAccountService } from './application/auth-account.service'
import { AuthSessionService } from './application/auth-session.service'
import { RegistrationStatusService } from './application/registration-status.service'
import { FirebaseAdminLogRepository } from './infrastructure/firebase-admin-log.repository'
import { FirebaseAuthClassroomRepository } from './infrastructure/firebase-auth-classroom.repository'
import { FirebaseAuthUserRepository } from './infrastructure/firebase-auth-user.repository'
import { FirebaseIdentityProvider } from './infrastructure/firebase-identity.provider'
import { SystemAuthClock } from './infrastructure/runtime-providers'

interface AuthModule {
  accountService: AuthAccountService
  adminLogService: AdminLogService
  registrationStatusService: RegistrationStatusService
  sessionService: AuthSessionService
}

let moduleInstance: AuthModule | null = null

export const getAuthModule = (): AuthModule => {
  if (moduleInstance) {
    return moduleInstance
  }

  const clock = new SystemAuthClock()
  const identityProvider = new FirebaseIdentityProvider()
  const userRepository = new FirebaseAuthUserRepository()
  const sessionService = new AuthSessionService({
    identityProvider,
    userRepository,
    clock
  })

  moduleInstance = {
    sessionService,
    accountService: new AuthAccountService({
      identityProvider,
      userRepository,
      sessionService,
      clock
    }),
    adminLogService: new AdminLogService({
      repository: new FirebaseAdminLogRepository({
        clock
      })
    }),
    registrationStatusService: new RegistrationStatusService({
      classroomRepository: new FirebaseAuthClassroomRepository()
    })
  }

  return moduleInstance
}
