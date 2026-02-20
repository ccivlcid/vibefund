import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAdmin, errorResponse, paginatedResponse } from '@/lib/auth'
import { getPaginationParams } from '@/lib/validate'
import { parseBody } from '@/lib/validate'

const listSchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  approval_status: z.string().optional(),
  search: z.string().optional(),
})

async function listAdminProjects(opts: { page: number; limit: number; approval_status?: string; search?: string }) {
  const offset = (opts.page - 1) * opts.limit
  let query = supabase
    .from('projects')
    .select(`
      id, title, status, approval_status, rejection_reason, created_at,
      user:users!user_id (id, name, email)
    `, { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + opts.limit - 1)
  if (opts.approval_status) query = query.eq('approval_status', opts.approval_status)
  if (opts.search) query = query.ilike('title', `%${opts.search}%`)
  const { data, error, count } = await query
  if (error) return null
  return paginatedResponse(data ?? [], { page: opts.page, limit: opts.limit, total: count ?? 0 })
}

// GET /api/v1/admin/projects
export const GET = withAdmin(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const { page, limit } = getPaginationParams(searchParams)
  const res = await listAdminProjects({
    page,
    limit,
    approval_status: searchParams.get('approval_status') ?? undefined,
    search: searchParams.get('search') ?? undefined,
  })
  if (!res) return errorResponse(500, 'INTERNAL_ERROR', '프로젝트 목록 조회 실패')
  return res
})

// POST /api/v1/admin/projects
export const POST = withAdmin(async (req: NextRequest) => {
  const parsed = await parseBody(req, listSchema)
  if (parsed.error) return parsed.error
  const page = parsed.data.page ?? 1
  const limit = parsed.data.limit ?? 20
  const res = await listAdminProjects({
    page,
    limit,
    approval_status: parsed.data.approval_status,
    search: parsed.data.search,
  })
  if (!res) return errorResponse(500, 'INTERNAL_ERROR', '프로젝트 목록 조회 실패')
  return res
})
