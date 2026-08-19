import { NextRequest } from 'next/server'
import { verifyAccessToken } from '@/lib/auth'
import { JwtPayload } from '@/types'

export function getRequestUser(request: NextRequest): JwtPayload {
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid authorization header', 401)
  }

  const token = authHeader.substring(7)

  try {
    return verifyAccessToken(token)
  } catch {
    throw new AuthError('Invalid or expired token', 401)
  }
}

export function requireRole(roles: string[]) {
  return (user: JwtPayload): void => {
    if (!roles.includes(user.role)) {
      throw new AuthError('Insufficient permissions', 403)
    }
  }
}

export class AuthError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'AuthError'
    this.statusCode = statusCode
  }
}
