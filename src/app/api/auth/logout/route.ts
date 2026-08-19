import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequestUser, AuthError } from '@/lib/auth-middleware'
import { auditLog } from '@/lib/audit'

export async function POST(request: NextRequest) {
  try {
    let user
    try {
      user = getRequestUser(request)
    } catch (e) {
      if (e instanceof AuthError) {
        return NextResponse.json({ success: false, error: e.message }, { status: e.statusCode })
      }
      throw e
    }

    const refreshToken = request.cookies.get('refreshToken')?.value

    if (refreshToken) {
      await db.refreshToken.deleteMany({ where: { token: refreshToken } })
    }

    // Also clean up any remaining refresh tokens for this user
    await db.refreshToken.deleteMany({ where: { userId: user.sub } })

    await auditLog({
      userId: user.sub,
      action: 'POST',
      resource: 'auth/logout',
      request,
    })

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })

    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
