import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, JwtPayload } from './jwt'

export type AuthedRequest = NextRequest & { user: JwtPayload }

type RouteCtx = { params: Promise<Record<string, string>> }
type RouteHandler = (req: AuthedRequest, ctx: RouteCtx) => Promise<NextResponse>

/**
 * API Route 핸들러를 감싸 JWT 인증을 강제합니다.
 * 토큰이 없거나 만료되면 401을 반환합니다.
 */
export function withAuth(handler: RouteHandler) {
  return async (req: NextRequest, ctx: RouteCtx) => {
    const token = extractToken(req)
    if (!token) {
      return errorResponse(401, 'UNAUTHORIZED', '인증 토큰이 없습니다.')
    }

    try {
      const payload = await verifyToken(token)
      ;(req as AuthedRequest).user = payload
      return handler(req as AuthedRequest, ctx)
    } catch {
      return errorResponse(401, 'INVALID_TOKEN', '토큰이 만료되었거나 유효하지 않습니다.')
    }
  }
}

/**
 * 관리자 권한까지 요구하는 래퍼
 */
export function withAdmin(handler: RouteHandler) {
  return withAuth(async (req, ctx) => {
    if (req.user.role !== 'admin') {
      return errorResponse(403, 'FORBIDDEN', '관리자 권한이 필요합니다.')
    }
    return handler(req, ctx)
  })
}

function extractToken(req: NextRequest): string | null {
  // 1) Authorization: Bearer <token>
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  // 2) HttpOnly Cookie
  return req.cookies.get('token')?.value ?? null
}

export function errorResponse(status: number, code: string, message: string, details?: object) {
  return NextResponse.json({ error: { code, message, ...(details && { details }) } }, { status })
}

export function successResponse(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status })
}

export function paginatedResponse(
  data: unknown[],
  meta: { page: number; limit: number; total: number }
) {
  return NextResponse.json({ data, meta })
}

export function noContentResponse() {
  return new NextResponse(null, { status: 204 })
}
