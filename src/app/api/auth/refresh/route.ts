import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateAccessToken, verifyAccessToken } from '@/lib/auth'
import { getRequestUser, AuthError } from '@/lib/auth-middleware'
import { auditLog } from '@/lib/audit'

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
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

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'Refresh token not found' },
        { status: 401 }
      )
    }

    // Validate refresh token in DB
    const storedToken = await db.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    })

    if (!storedToken || storedToken.userId !== user.sub) {
      return NextResponse.json(
        { success: false, error: 'Invalid refresh token' },
        { status: 401 }
      )
    }

    if (storedToken.expiresAt < new Date()) {
      // Clean up expired token
      await db.refreshToken.delete({ where: { id: storedToken.id } })
      return NextResponse.json(
        { success: false, error: 'Refresh token expired' },
        { status: 401 }
      )
    }

    // Delete old refresh token (rotation)
    await db.refreshToken.delete({ where: { id: storedToken.id } })

    // Generate new access token
    const userInfo = {
      id: storedToken.user.id,
      email: storedToken.user.email,
      name: storedToken.user.name,
      role: storedToken.user.role,
      branchId: storedToken.user.branchId,
      branchName: storedToken.user.branchName,
    }

    const newAccessToken = generateAccessToken(userInfo)

    await auditLog({
      userId: user.sub,
      action: 'POST',
      resource: 'auth/refresh',
      request,
    })

    return NextResponse.json({
      success: true,
      data: { accessToken: newAccessToken },
    })
  } catch (error) {
    console.error('Refresh error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
