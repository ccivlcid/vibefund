import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, errorResponse, paginatedResponse } from '@/lib/auth'
import { getPaginationParams } from '@/lib/validate'

// GET /api/v1/users/me/projects
export const GET = withAuth(async (req: AuthedRequest) => {
  const { searchParams } = new URL(req.url)
  const { page, limit, offset } = getPaginationParams(searchParams)
  const status = searchParams.get('status')

  let query = supabase
    .from('projects')
    .select(`
      id, title, status, approval_status, thumbnail_url, created_at,
      funding:fundings!project_id (goal_amount, deadline)
    `, { count: 'exact' })
    .eq('user_id', req.user.sub)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)

  const { data, error, count } = await query

  if (error) return errorResponse(500, 'INTERNAL_ERROR', '내 프로젝트 조회 실패')

  return paginatedResponse(data ?? [], { page, limit, total: count ?? 0 })
})
