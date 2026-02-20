import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { withAdmin, errorResponse, paginatedResponse } from '@/lib/auth'
import { getPaginationParams } from '@/lib/validate'

// GET /api/v1/admin/projects
export const GET = withAdmin(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const { page, limit, offset } = getPaginationParams(searchParams)
  const approvalStatus = searchParams.get('approval_status')
  const search = searchParams.get('search')

  let query = supabase
    .from('projects')
    .select(`
      id, title, status, approval_status, rejection_reason, created_at,
      user:users!user_id (id, name, email)
    `, { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (approvalStatus) query = query.eq('approval_status', approvalStatus)
  if (search)         query = query.ilike('title', `%${search}%`)

  const { data, error, count } = await query

  if (error) return errorResponse(500, 'INTERNAL_ERROR', '프로젝트 목록 조회 실패')

  return paginatedResponse(data ?? [], { page, limit, total: count ?? 0 })
})
