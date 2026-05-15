export interface AuthLoginSucceededEvent {
  type: 'auth.login-succeeded'
  userId: string
  occurredAt: string
}

export interface AuthLogoutSucceededEvent {
  type: 'auth.logout-succeeded'
  userId: string
  occurredAt: string
}

export interface AuthAccountRegisteredEvent {
  type: 'auth.account-registered'
  userId: string
  occurredAt: string
}
