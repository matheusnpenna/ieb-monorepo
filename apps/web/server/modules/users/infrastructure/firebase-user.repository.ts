import type { User } from '@ieb/shared'
import type { UserRepository } from '../application/ports'
import { getFirebaseAdminCollection } from '../../../utils/firebase-admin'

const toUserDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    id: snapshot.id,
    ...(snapshot.data() as Omit<User, 'id'>)
  }) as User

export class FirebaseUserRepository implements UserRepository {
  async listAll() {
    const snapshot = await getFirebaseAdminCollection('users').get()

    return snapshot.docs.map(toUserDocument)
  }

  async findById(userId: string) {
    const snapshot = await getFirebaseAdminCollection('users').doc(userId).get()

    if (!snapshot.exists) {
      return null
    }

    return toUserDocument(snapshot)
  }

  async findActiveByCpf(cpf: string) {
    const snapshot = await getFirebaseAdminCollection('users').where('cpf', '==', cpf).get()
    const validDocument = snapshot.docs.find((document) => {
      const user = toUserDocument(document)

      return !user.deletedAt
    })

    return validDocument ? toUserDocument(validDocument) : null
  }

  async save(user: User, options?: { merge?: boolean }) {
    if (options?.merge) {
      await getFirebaseAdminCollection('users').doc(user.id).set(user, { merge: true })
      return
    }

    await getFirebaseAdminCollection('users').doc(user.id).set(user)
  }
}
