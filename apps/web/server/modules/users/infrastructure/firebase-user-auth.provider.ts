import type { UserAuthProvider } from '../application/ports'
import { getFirebaseAdminAuth } from '../../shared/infrastructure/firebase-admin'

export class FirebaseUserAuthProvider implements UserAuthProvider {
  async createUser(input: {
    email: string
    password?: string
    displayName: string
    disabled: boolean
  }) {
    const authRecord = await getFirebaseAdminAuth().createUser(input)

    return {
      uid: authRecord.uid
    }
  }

  async updateUser(
    userId: string,
    input: {
      email?: string
      password?: string
      displayName?: string
      disabled?: boolean
    }
  ) {
    await getFirebaseAdminAuth().updateUser(userId, input)
  }

  async deleteUser(userId: string) {
    await getFirebaseAdminAuth().deleteUser(userId)
  }

  async revokeRefreshTokens(userId: string) {
    await getFirebaseAdminAuth().revokeRefreshTokens(userId)
  }
}
