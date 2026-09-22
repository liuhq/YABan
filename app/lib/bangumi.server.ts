import { isNonEmptyString, isOptionalString, isPositiveInteger, isRecord } from "./predicate"
import { readEnv } from "./readenv.server"

const OAUTH_BASE_URL = "https://bgm.tv/oauth/"
const P1_BASE_URL = "https://next.bgm.tv/p1/"
const REQUEST_TIMEOUT_MS = 10_000
const DEFAULT_USER_AGENT = "horin/yaban (https://github.com/liuhq/YABan)"

export const BANGUMI_SCOPES = [
  "read:collection",
  "write:collection",
  "read:indices",
  "write:indices",
  "read:topic",
  "write:topic",
  "read:wiki",
  "write:wiki",
] as const

export type BangumiScope = (typeof BANGUMI_SCOPES)[number]

export interface BangumiTokenResponse {
  accessToken: string
  expiresIn: number
  tokenType: "Bearer"
  scope?: string
  refreshToken: string
  userID: string
}

export class BangumiOAuthError extends Error {
  override readonly name = "BangumiOAuthError"
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

export interface BangumiOAuthConfig {
  clientID: string
  clientSecret: string
  redirectUri: string
  userAgent: string
}

export function getUserAgent(): string {
  return readEnv.optional("USER_AGENT") ?? DEFAULT_USER_AGENT
}

const readConfig = (): BangumiOAuthConfig => {
  const redirectUri = readEnv.required("BANGUMI_REDIRECT_URI")

  let parsedRedirectUri: URL
  try {
    parsedRedirectUri = new URL(redirectUri)
  } catch {
    throw new Error("BANGUMI_REDIRECT_URI must be an absolute URL")
  }
  if (parsedRedirectUri.protocol !== "https:" && parsedRedirectUri.protocol !== "http:") {
    throw new Error("BANGUMI_REDIRECT_URI only allows HTTP and HTTPS")
  }

  return {
    clientID: readEnv.required("BANGUMI_CLIENT_ID"),
    clientSecret: readEnv.required("BANGUMI_CLIENT_SECRET"),
    redirectUri,
    userAgent: getUserAgent(),
  }
}

const parseTokenResponse = (value: unknown): BangumiTokenResponse => {
  const bangumiOAuthError = (message: string) =>
    new BangumiOAuthError(502, "INVALID_UPSTREAM_RESPONSE", message)

  if (!isRecord(value)) {
    throw bangumiOAuthError("Invalid OAuth response")
  }

  const accessToken = value.access_token
  if (!isNonEmptyString(accessToken)) {
    throw bangumiOAuthError("Invalid access_token")
  }

  const expiresIn = value.expires_in
  if (!isPositiveInteger(expiresIn)) {
    throw bangumiOAuthError("Invalid expires_in")
  }

  const tokenType = value.token_type
  if (!isNonEmptyString(tokenType) || tokenType !== "Bearer") {
    throw bangumiOAuthError("Invalid token_type")
  }

  const scope = value.scope
  if (!isOptionalString(scope)) {
    throw bangumiOAuthError("Invalid scope")
  }

  const refreshToken = value.refresh_token
  if (!isNonEmptyString(refreshToken)) {
    throw bangumiOAuthError("Invalid refresh_token")
  }

  const userID = value.user_id
  if (!isNonEmptyString(userID)) {
    throw bangumiOAuthError("Invalid user_id")
  }

  return {
    accessToken,
    expiresIn,
    tokenType,
    scope,
    refreshToken,
    userID,
  }
}

export function createBangumiAuthorizationURL(state: string): string {
  if (state.trim() === "") {
    throw new Error("OAuth state must be a non-empty string")
  }

  const config = readConfig()
  const url = new URL("authorize", OAUTH_BASE_URL)

  url.search = new URLSearchParams({
    client_id: config.clientID,
    response_type: "code",
    redirect_uri: config.redirectUri,
    scope: BANGUMI_SCOPES.join(","),
    state,
  }).toString()

  return url.href
}

const requestToken = async (grant: Record<string, string>): Promise<BangumiTokenResponse> => {
  const config = readConfig()
  const url = new URL("access_token", OAUTH_BASE_URL)
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": config.userAgent,
  })
  const body = new URLSearchParams({
    ...grant,
    client_id: config.clientID,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
  })

  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const errCode =
      isRecord(payload) && typeof payload.code === "string" ? payload.code : "OAUTH_REQUEST_FAILED"
    const errMessage =
      isRecord(payload) && typeof payload.message === "string"
        ? payload.message
        : `Bangumi OAuth returned HTTP ${response.status}`
    throw new BangumiOAuthError(response.status, errCode, errMessage)
  }

  return parseTokenResponse(payload)
}

export async function exchangeBangumiAuthorizationCode(
  code: string,
): Promise<BangumiTokenResponse> {
  if (!isNonEmptyString(code)) {
    throw new Error("Authorization code must be a non-empty string")
  }

  return requestToken({
    grant_type: "authorization_code",
    code,
  })
}

export async function refreshAccessToken(refreshToken: string): Promise<BangumiTokenResponse> {
  if (!isNonEmptyString(refreshToken)) {
    throw new Error("Refresh token must be a non-empty string")
  }

  return requestToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  })
}

export function createBangumiAPIURL(path: string): URL {
  const url = new URL(path.replace(/^\/+/, ""), P1_BASE_URL)

  if (url.origin !== "https://next.bgm.tv" || !url.pathname.startsWith("/p1/")) {
    throw new Error("Bangumi API path must stay within /p1/")
  }

  return url
}
