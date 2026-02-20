import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, errorResponse, paginatedResponse } from '@/lib/auth'
import { getPaginationParams } from '@/lib/validate'
import { parseBody } from '@/lib/validate'

const listSchema = z.object({ page: z.number().int().min(1).optional(), limit: z.number().int().min(1).max(100).optional() })

// GET /api/v1/users/me/pledges
export const GET = withAuth(async (req: AuthedRequest) => {
  const { page, limit, offset } = getPaginationParams(new URL(req.url).searchParams)
  const { data, error, count } = await supabase
    .from('pledges')
    .select(`
      id, amount, status, created_at,
      project:projects!project_id (id, title),
      reward:rewards (id, name)
    `, { count: 'exact' })
    .eq('user_id', req.user.sub)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) return errorResponse(500, 'INTERNAL_ERROR', '내 후원 목록 조회 실패')
  return paginatedResponse(data ?? [], { page, limit, total: count ?? 0 })
})

// POST /api/v1/users/me/pledges
export const POST = withAuth(async (req: AuthedRequest) => {
  const parsed = await parseBody(req as NextRequest, listSchema)
  if (parsed.error) return parsed.error
  const page = parsed.data.page ?? 1
  const limit = parsed.data.limit ?? 50
  const offset = (page - 1) * limit
  const { data, error, count } = await supabase
    .from('pledges')
    .select(`
      id, amount, status, created_at,
      project:projects!project_id (id, title),
      reward:rewards (id, name)
    `, { count: 'exact' })
    .eq('user_id', req.user.sub)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) return errorResponse(500, 'INTERNAL_ERROR', '내 후원 목록 조회 실패')
  return paginatedResponse(data ?? [], { page, limit, total: count ?? 0 })
})
