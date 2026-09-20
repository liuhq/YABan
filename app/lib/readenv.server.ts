class MissingEnvError extends Error {
  constructor(readonly name: string) {
    super(`Missing environment variable: ${name}`)
  }
}

class InvalidEnvError extends Error {
  constructor(
    readonly name: string,
    readonly type: string,
  ) {
    super(`Invalid environment variable: ${name}, must be ${type}`)
  }
}

const optional = (name: string): string | undefined => {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

const required = (name: string): string => {
  const value = optional(name)
  if (value === undefined) {
    throw new MissingEnvError(name)
  }
  return value
}

const integerOpt = (name: string): number | undefined => {
  const value = optional(name)
  if (value === undefined) {
    return undefined
  }

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new InvalidEnvError(name, "a non-negative integer")
  }

  return parsed
}

const integerReq = (name: string): number => {
  const value = integerOpt(name)
  if (value === undefined) {
    throw new MissingEnvError(name)
  }
  return value
}

const booleanOpt = (name: string): boolean | undefined => {
  const value = optional(name)
  if (value === undefined) {
    return undefined
  }

  if (value === "true" || value === "1") {
    return true
  }

  if (value === "false" || value === "0") {
    return false
  }

  throw new InvalidEnvError(name, '"true"/"false" or "1"/"0"')
}

const booleanReq = (name: string): boolean => {
  const value = booleanOpt(name)
  if (value === undefined) {
    throw new MissingEnvError(name)
  }
  return value
}

export const readEnv = {
  optional,
  required,
  integerOpt,
  integerReq,
  booleanOpt,
  booleanReq,
  MissingEnvError,
  InvalidEnvError,
} as const
