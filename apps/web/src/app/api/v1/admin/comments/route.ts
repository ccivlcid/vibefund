import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { withAdmin, errorResponse, paginatedResponse } from '@/lib/auth'
import { getPaginationParams } from '@/lib/validate'

// GET /api/v1/admin/comments
export const GET = withAdmin(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const { page, limit, offset } = getPaginationParams(searchParams)
  const projectId = searchParams.get('project_id')

  let query = supabase
    .from('comments')
    .select(`
      id, body, created_at,
      project:projects!project_id (id, title),
      user:users!user_id (id, name, email)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (projectId) query = query.eq('project_id', projectId)

  const { data, error, count } = await query

  if (error) return errorResponse(500, 'INTERNAL_ERROR', '댓글 목록 조회 실패')

  return paginatedResponse(data ?? [], { page, limit, total: count ?? 0 })
})
