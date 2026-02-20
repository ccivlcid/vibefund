import { supabase } from '@/lib/supabase'
import { withAdmin, errorResponse, noContentResponse } from '@/lib/auth'

// DELETE /api/v1/admin/comments/:id
export const DELETE = withAdmin(async (_, { params }) => {
  const { id } = await params

  const { error } = await supabase.from('comments').delete().eq('id', id)

  if (error) return errorResponse(500, 'INTERNAL_ERROR', '댓글 삭제 실패')

  return noContentResponse()
})
