import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, errorResponse, paginatedResponse } from '@/lib/auth'
import { getPaginationParams } from '@/lib/validate'
import { parseBody } from '@/lib/validate'

const listSchema = z.object({ page: z.number().int().min(1).optional(), limit: z.number().int().min(1).max(100).optional(), status: z.string().optional() })

async function listMyProjects(req: AuthedRequest, opts: { page: number; limit: number; status?: string }) {
  const offset = (opts.page - 1) * opts.limit
  let query = supabase
    .from('projects')
    .select(`
      id, title, status, approval_status, thumbnail_url, created_at,
      funding:fundings!project_id (goal_amount, deadline)
    `, { count: 'exact' })
    .eq('user_id', req.user.sub)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + opts.limit - 1)
  if (opts.status) query = query.eq('status', opts.status)
  const { data, error, count } = await query
  if (error) return null
  return paginatedResponse(data ?? [], { page: opts.page, limit: opts.limit, total: count ?? 0 })
}

// GET /api/v1/users/me/projects
export const GET = withAuth(async (req: AuthedRequest) => {
  const { searchParams } = new URL(req.url)
  const { page, limit } = getPaginationParams(searchParams)
  const res = await listMyProjects(req, { page, limit, status: searchParams.get('status') ?? undefined })
  if (!res) return errorResponse(500, 'INTERNAL_ERROR', '내 프로젝트 조회 실패')
  return res
})

// POST /api/v1/users/me/projects
export const POST = withAuth(async (req: AuthedRequest) => {
  const parsed = await parseBody(req as NextRequest, listSchema)
  if (parsed.error) return parsed.error
  const page = parsed.data.page ?? 1
  const limit = parsed.data.limit ?? 50
  const res = await listMyProjects(req, { page, limit, status: parsed.data.status })
  if (!res) return errorResponse(500, 'INTERNAL_ERROR', '내 프로젝트 조회 실패')
  return res
})
