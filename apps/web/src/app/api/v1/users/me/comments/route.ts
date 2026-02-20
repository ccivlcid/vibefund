import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, errorResponse, paginatedResponse } from '@/lib/auth'
import { getPaginationParams } from '@/lib/validate'

// GET /api/v1/users/me/comments
export const GET = withAuth(async (req: AuthedRequest) => {
  const { page, limit, offset } = getPaginationParams(new URL(req.url).searchParams)

  const { data, error, count } = await supabase
    .from('comments')
    .select(`
      id, body, created_at,
      project:projects!project_id (id, title)
    `, { count: 'exact' })
    .eq('user_id', req.user.sub)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return errorResponse(500, 'INTERNAL_ERROR', '내 댓글 조회 실패')

  return paginatedResponse(data ?? [], { page, limit, total: count ?? 0 })
})
