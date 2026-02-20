import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { errorResponse, paginatedResponse } from '@/lib/auth'
import { parseBody } from '@/lib/validate'

const listSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  status: z.string().optional(),
  sort: z.enum(['created_at', 'deadline']).default('created_at'),
  search: z.string().optional(),
})

// POST /api/v1/projects/list — 프로젝트 목록 (body 기반)
export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, listSchema)
  if (parsed.error) return parsed.error

  const page = parsed.data.page ?? 1
  const limit = parsed.data.limit ?? 20
  const sort = parsed.data.sort ?? 'created_at'
  const { category, status, search } = parsed.data
  const offset = (page - 1) * limit

  let query = supabase
    .from('projects')
    .select(
      `
      id, title, short_description, category, status, thumbnail_url, service_url,
      created_at,
      user:users!user_id (id, name, avatar_url),
      funding:fundings!project_id (goal_amount, deadline, min_pledge_amount)
    `,
      { count: 'exact' }
    )
    .eq('approval_status', 'approved')
    .is('deleted_at', null)
    .order(sort, { ascending: false })
    .range(offset, offset + limit - 1)

  if (category) query = query.eq('category', category)
  if (status) query = query.eq('status', status)
  const searchTrimmed = search?.trim()
  if (searchTrimmed) {
    const term = `%${searchTrimmed}%`
    query = query.or(`title.ilike.${term},short_description.ilike.${term}`)
  }

  const { data, error, count } = await query

  if (error) return errorResponse(500, 'INTERNAL_ERROR', '프로젝트 목록 조회 실패')

  return paginatedResponse(data ?? [], { page, limit, total: count ?? 0 })
}
