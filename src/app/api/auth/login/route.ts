import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { comparePassword, generateAccessToken, generateRefreshToken, getRefreshTokenExpiry, isRateLimited, recordFailedAttempt, clearFailedAttempts } from '@/lib/auth'
import { auditLog } from '@/lib/audit'
import { trackLogin, initTracker } from '@/lib/license'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Rate limiting
    if (isRateLimited(email)) {
      return NextResponse.json(
        { success: false, error: 'Too many failed login attempts. Please try again in 15 minutes.' },
        { status: 429 }
      )
    }

    const user = await db.user.findUnique({ where: { email } })

    if (!user || !user.isActive) {
      recordFailedAttempt(email)
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const isValid = await comparePassword(password, user.passwordHash)
    if (!isValid) {
      recordFailedAttempt(email)
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    clearFailedAttempts(email)

    const userInfo = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      branchId: user.branchId,
      branchName: user.branchName,
    }

    const accessToken = generateAccessToken(userInfo)
    const refreshToken = generateRefreshToken()
    const refreshTokenExpiry = getRefreshTokenExpiry()

    // Store refresh token in DB
    await db.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: refreshTokenExpiry,
      },
    })

    await auditLog({
      userId: user.id,
      action: 'POST',
      resource: 'auth/login',
      request,
    })

    // License tracking: log every login with user identity
    initTracker().catch(() => {})
    trackLogin(user.id, user.role, {
      email: user.email,
      name: user.name,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    })

    const response = NextResponse.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: userInfo,
      },
    })

    // Set refresh token as httpOnly cookie
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: refreshTokenExpiry,
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
