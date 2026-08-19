import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { UserInfo, JwtPayload } from '@/types'

export const JWT_SECRET = 'corporate-ride-hailing-secret-key-2024'
export const JWT_REFRESH_SECRET = 'corporate-ride-hailing-refresh-secret-key-2024'

const SALT_ROUNDS = 10
const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY_DAYS = 7
const RATE_LIMIT_MAX_ATTEMPTS = 5
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

// ============ In-memory rate limiter ============
const loginAttempts = new Map<string, { count: number; lastAttempt: Date }>()

function isRateLimited(email: string): boolean {
  const record = loginAttempts.get(email)
  if (!record) return false

  const now = new Date()
  const elapsed = now.getTime() - record.lastAttempt.getTime()

  if (elapsed > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.delete(email)
    return false
  }

  return record.count >= RATE_LIMIT_MAX_ATTEMPTS
}

function recordFailedAttempt(email: string): void {
  const record = loginAttempts.get(email)
  const now = new Date()

  if (!record) {
    loginAttempts.set(email, { count: 1, lastAttempt: now })
  } else {
    const elapsed = now.getTime() - record.lastAttempt.getTime()
    if (elapsed > RATE_LIMIT_WINDOW_MS) {
      loginAttempts.set(email, { count: 1, lastAttempt: now })
    } else {
      record.count += 1
      record.lastAttempt = now
    }
  }
}

function clearFailedAttempts(email: string): void {
  loginAttempts.delete(email)
}

// ============ Password ============
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ============ JWT ============
export function generateAccessToken(user: UserInfo): string {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    branchId: user.branchId,
    branchName: user.branchName,
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY })
}

export function generateRefreshToken(): string {
  return uuidv4()
}

export function getRefreshTokenExpiry(): Date {
  const d = new Date()
  d.setDate(d.getDate() + REFRESH_TOKEN_EXPIRY_DAYS)
  return d
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload
}

export { isRateLimited, recordFailedAttempt, clearFailedAttempts }
