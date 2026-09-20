export interface PendingSession {
  kind: "pending"
  state: string
  returnTo: string
}

export interface AuthSession {
  kind: "authenticated"
  userId: string
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: number
  sessionExpiresAt: number
}

export type StoredSession = PendingSession | AuthSession
