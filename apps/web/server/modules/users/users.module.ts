import { UserEnrollmentsService } from './application/user-enrollments.service'
import { UsersService } from './application/users.service'
import { AdminLogAdapter } from './infrastructure/admin-log.adapter'
import { FirebaseUserAuthProvider } from './infrastructure/firebase-user-auth.provider'
import { FirebaseUserCourseRepository } from './infrastructure/firebase-user-course.repository'
import { FirebaseUserEnrollmentRepository } from './infrastructure/firebase-user-enrollment.repository'
import { FirebaseUserRepository } from './infrastructure/firebase-user.repository'
import { SystemUserClock } from './infrastructure/runtime-providers'

interface UsersModule {
  usersService: UsersService
  userEnrollmentsService: UserEnrollmentsService
  adminLog: AdminLogAdapter
}

let moduleInstance: UsersModule | null = null

export const getUsersModule = (): UsersModule => {
  if (moduleInstance) {
    return moduleInstance
  }

  const adminLog = new AdminLogAdapter()
  const userRepository = new FirebaseUserRepository()
  const clock = new SystemUserClock()

  moduleInstance = {
    adminLog,
    usersService: new UsersService({
      repository: userRepository,
      authProvider: new FirebaseUserAuthProvider(),
      adminLog,
      clock
    }),
    userEnrollmentsService: new UserEnrollmentsService({
      userRepository,
      courseRepository: new FirebaseUserCourseRepository(),
      enrollmentRepository: new FirebaseUserEnrollmentRepository(),
      adminLog,
      clock
    })
  }

  return moduleInstance
}
