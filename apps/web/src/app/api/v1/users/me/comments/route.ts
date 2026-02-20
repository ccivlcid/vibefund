import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, errorResponse, paginatedResponse } from '@/lib/auth'
import { getPaginationParams } from '@/lib/validate'
import { parseBody } from '@/lib/validate'

const listSchema = z.object({ page: z.number().int().min(1).optional(), limit: z.number().int().min(1).max(100).optional() })

async function listMyComments(req: AuthedRequest, page: number, limit: number) {
  const offset = (page - 1) * limit
  const { data, error, count } = await supabase
    .from('comments')
    .select(`
      id, body, created_at,
      project:projects!project_id (id, title)
    `, { count: 'exact' })
    .eq('user_id', req.user.sub)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) return null
  const items = (data ?? []).map((c: { body?: string; [k: string]: unknown }) => ({
    ...c,
    content: c.body ?? c.content ?? '',
  }))
  return paginatedResponse(items, { page, limit, total: count ?? 0 })
}

// GET /api/v1/users/me/comments
export const GET = withAuth(async (req: AuthedRequest) => {
  const { page, limit } = getPaginationParams(new URL(req.url).searchParams)
  const res = await listMyComments(req, page, limit)
  if (!res) return errorResponse(500, 'INTERNAL_ERROR', '내 댓글 조회 실패')
  return res
})

// POST /api/v1/users/me/comments
export const POST = withAuth(async (req: AuthedRequest) => {
  const parsed = await parseBody(req as NextRequest, listSchema)
  if (parsed.error) return parsed.error
  const page = parsed.data.page ?? 1
  const limit = parsed.data.limit ?? 50
  const res = await listMyComments(req, page, limit)
  if (!res) return errorResponse(500, 'INTERNAL_ERROR', '내 댓글 조회 실패')
  return res
})
