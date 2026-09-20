import { Decoder, GlideClient, GlideClientConfiguration, TimeUnit } from "@valkey/valkey-glide"

import { readEnv } from "./readenv.server"

let clientPromise: Promise<GlideClient> | undefined

const createClient = (): Promise<GlideClient> => {
  const username = readEnv.optional("VALKEY_USERNAME")
  const password = readEnv.optional("VALKEY_PASSWORD")
  if (username && !password) {
    throw new Error("VALKEY_PASSWORD is required when VALKEY_USERNAME is provided")
  }

  const config: GlideClientConfiguration = {
    addresses: [
      {
        host: readEnv.optional("VALKEY_HOST") ?? "127.0.0.1",
        port: readEnv.integerOpt("VALKEY_PORT"),
      },
    ],
    credentials: password ? { password, ...(username ? { username } : {}) } : undefined,
    useTLS: readEnv.booleanOpt("VALKEY_TLS"),
    databaseId: readEnv.integerOpt("VALKEY_DATABASE"),
    requestTimeout: readEnv.integerOpt("VALKEY_REQUEST_TIMEOUT_MS"),
    clientName: "yaban",
  }

  return GlideClient.createClient(config)
}

const getValkey = (): Promise<GlideClient> => {
  if (!clientPromise) {
    const conn = createClient()
    clientPromise = conn

    void conn.catch(() => {
      if (clientPromise === conn) {
        clientPromise = undefined
      }
    })
  }

  return clientPromise
}

const namespacedKay = (key: string): string => {
  const prefix = readEnv.optional("VALKEY_KEY_PREFIX") ?? "yaban:"
  return `${prefix}${key}`
}

export async function valkeyGet<T>(key: string): Promise<T | null> {
  const client = await getValkey()
  const value = await client.get(namespacedKay(key), { decoder: Decoder.String })

  if (value === null) {
    return null
  }

  return JSON.parse(value as string) as T
}

export async function valkeySet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!Number.isInteger(ttlSeconds) || ttlSeconds === 0) {
    throw new Error("Valkey TTL must be a positive integer")
  }

  const client = await getValkey()

  await client.set(namespacedKay(key), JSON.stringify(value), {
    decoder: Decoder.String,
    expiry: {
      type: TimeUnit.Seconds,
      count: ttlSeconds,
    },
  })
}

export async function valkeyDel(key: string): Promise<void> {
  const client = await getValkey()

  await client.del([namespacedKay(key)])
}

export async function valkeyRefreshTTL(key: string, ttlSeconds: number): Promise<void> {
  const client = await getValkey()

  await client.expire(namespacedKay(key), ttlSeconds)
}
