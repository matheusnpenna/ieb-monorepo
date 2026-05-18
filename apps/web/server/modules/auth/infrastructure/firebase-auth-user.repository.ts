import type { User } from '@ieb/shared'
import type { AuthUserRepository } from '../application/ports'
import { getFirebaseAdminCollection } from '../../shared/infrastructure/firebase-admin'

const toUserDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    ...(snapshot.data() as Omit<User, 'id'>),
    id: snapshot.id
  }) as User

export class FirebaseAuthUserRepository implements AuthUserRepository {
  async findById(uid: string) {
    const snapshot = await getFirebaseAdminCollection('users').doc(uid).get()

    if (!snapshot.exists) {
      return null
    }

    return toUserDocument(snapshot)
  }

  async findActiveByCpf(cpf: string) {
    const snapshot = await getFirebaseAdminCollection('users').where('cpf', '==', cpf).limit(5).get()
    const validDocument = snapshot.docs.find((document) => {
      const user = toUserDocument(document)

      return !user.deletedAt
    })

    return validDocument ? toUserDocument(validDocument) : null
  }

  async save(user: User) {
    await getFirebaseAdminCollection('users').doc(user.id).set(user)
  }

  async update(uid: string, payload: Partial<User>) {
    await getFirebaseAdminCollection('users').doc(uid).set(payload, { merge: true })
  }
}
