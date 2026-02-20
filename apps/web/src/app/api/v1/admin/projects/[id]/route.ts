import { supabase } from '@/lib/supabase'
import { withAdmin, AuthedRequest, errorResponse, noContentResponse } from '@/lib/auth'

// DELETE /api/v1/admin/projects/:id — DB에서 프로젝트 완전 삭제 (관리자 전용, CASCADE로 연관 데이터 함께 삭제)
export const DELETE = withAdmin(async (_req: AuthedRequest, { params }) => {
  const { id } = await params

  const { data: existing } = await supabase
    .from('projects')
    .select('id')
    .eq('id', id)
    .single()

  if (!existing) return errorResponse(404, 'PROJECT_NOT_FOUND', '프로젝트를 찾을 수 없습니다.')

  const { error } = await supabase.from('projects').delete().eq('id', id)

  if (error) return errorResponse(500, 'INTERNAL_ERROR', '프로젝트 삭제 실패')

  return noContentResponse()
})
