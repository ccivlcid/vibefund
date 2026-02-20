import { ZodSchema } from 'zod'
import { NextResponse } from 'next/server'
import { errorResponse } from './auth'

/**
 * 요청 body를 Zod 스키마로 파싱합니다.
 * 실패 시 400 에러 응답을 반환합니다.
 */
export async function parseBody<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  try {
    const json = await req.json()
    const result = schema.safeParse(json)
    if (!result.success) {
      const details = result.error.flatten().fieldErrors
      return {
        data: null,
        error: errorResponse(400, 'VALIDATION_ERROR', '요청 데이터가 올바르지 않습니다.', details),
      }
    }
    return { data: result.data, error: null }
  } catch {
    return {
      data: null,
      error: errorResponse(400, 'INVALID_JSON', '올바른 JSON 형식이 아닙니다.'),
    }
  }
}

export function getPaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
  const offset = (page - 1) * limit
  return { page, limit, offset }
}
