import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { atomicWriteFile } from './atomic-write'

/**
 * A general Plot Docs account stored on this device.
 *
 * The password itself is never written to disk: a fresh 16-byte salt and a
 * 64-byte scrypt digest are stored instead. The account is deliberately local
 * to the app; no third-party identity page or browser round-trip is involved.
 */
export interface LocalAccountStatus {
  loggedIn: boolean
  email?: string
  name?: string
  /** true when this is a Plot Docs account rather than a legacy provider session */
  local?: boolean
  /** whether the device already has an account (drives sign-in vs create-account) */
  hasAccount?: boolean
}

export type LocalAccountError =
  | 'invalid-name'
  | 'invalid-email'
  | 'weak-password'
  | 'exists'
  | 'no-account'
  | 'bad-credentials'
  | 'storage'

export type LocalAccountResult =
  | { ok: true; status: LocalAccountStatus }
  | { ok: false; error: LocalAccountError }

interface AccountRecord {
  version: 1
  name: string
  email: string
  salt: string
  hash: string
  signedIn: boolean
  createdAt: string
  updatedAt: string
}

const ACCOUNT_FILE = 'account.json'
const MIN_PASSWORD = 8
const MAX_PASSWORD = 200
const MAX_NAME = 80
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function accountPath(userData: string): string {
  return join(userData, ACCOUNT_FILE)
}

function readRecord(userData: string): AccountRecord | null {
  const file = accountPath(userData)
  if (!existsSync(file)) return null
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'))
    if (!parsed || typeof parsed !== 'object') return null
    const value = parsed as Partial<AccountRecord>
    if (
      value.version !== 1 ||
      typeof value.name !== 'string' ||
      typeof value.email !== 'string' ||
      typeof value.salt !== 'string' ||
      typeof value.hash !== 'string' ||
      typeof value.signedIn !== 'boolean'
    ) {
      return null
    }
    return value as AccountRecord
  } catch {
    return null
  }
}

async function writeRecord(userData: string, record: AccountRecord): Promise<void> {
  await atomicWriteFile(accountPath(userData), Buffer.from(JSON.stringify(record, null, 2)))
}

function publicStatus(record: AccountRecord | null, signedIn: boolean): LocalAccountStatus {
  if (!record) return { loggedIn: false, hasAccount: false, local: true }
  return {
    loggedIn: signedIn,
    hasAccount: true,
    local: true,
    ...(signedIn ? { email: record.email, name: record.name } : {}),
  }
}

function digest(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 })
}

function equalDigest(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b)
}

export function localAccountStatus(userData: string): LocalAccountStatus {
  const record = readRecord(userData)
  return publicStatus(record, record?.signedIn ?? false)
}

export async function createLocalAccount(
  userData: string,
  input: { name: string; email: string; password: string },
): Promise<LocalAccountResult> {
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  const password = input.password
  if (!name || name.length > MAX_NAME) return { ok: false, error: 'invalid-name' }
  if (email.length > 254 || !EMAIL_RE.test(email)) return { ok: false, error: 'invalid-email' }
  if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
    return { ok: false, error: 'weak-password' }
  }
  if (readRecord(userData)) return { ok: false, error: 'exists' }

  const salt = randomBytes(16)
  const record: AccountRecord = {
    version: 1,
    name,
    email,
    salt: salt.toString('base64'),
    hash: digest(password, salt).toString('base64'),
    signedIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  try {
    await writeRecord(userData, record)
  } catch {
    return { ok: false, error: 'storage' }
  }
  return { ok: true, status: publicStatus(record, true) }
}

export async function signInLocalAccount(
  userData: string,
  input: { email: string; password: string },
): Promise<LocalAccountResult> {
  const record = readRecord(userData)
  if (!record) return { ok: false, error: 'no-account' }
  const email = input.email.trim().toLowerCase()
  if (email !== record.email) return { ok: false, error: 'bad-credentials' }
  let stored: Buffer
  let supplied: Buffer
  try {
    stored = Buffer.from(record.hash, 'base64')
    supplied = digest(input.password, Buffer.from(record.salt, 'base64'))
  } catch {
    return { ok: false, error: 'bad-credentials' }
  }
  if (!equalDigest(stored, supplied)) return { ok: false, error: 'bad-credentials' }

  record.signedIn = true
  record.updatedAt = new Date().toISOString()
  try {
    await writeRecord(userData, record)
  } catch {
    return { ok: false, error: 'storage' }
  }
  return { ok: true, status: publicStatus(record, true) }
}

export async function signOutLocalAccount(userData: string): Promise<LocalAccountStatus> {
  const record = readRecord(userData)
  if (!record) return { loggedIn: false, hasAccount: false, local: true }
  record.signedIn = false
  record.updatedAt = new Date().toISOString()
  try {
    await writeRecord(userData, record)
  } catch {
    // the in-memory result is still signed out; a later write can retry
  }
  return publicStatus(record, false)
}
