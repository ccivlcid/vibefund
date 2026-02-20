import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, successResponse, errorResponse, noContentResponse } from '@/lib/auth'
import { parseBody } from '@/lib/validate'

// PATCH /api/v1/updates/:id
export const PATCH = withAuth(async (req: AuthedRequest, { params }) => {
  const { id } = await params

  const { data: update } = await supabase
    .from('updates')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!update) return errorResponse(404, 'NOT_FOUND', '업데이트를 찾을 수 없습니다.')
  if (update.user_id !== req.user.sub) {
    return errorResponse(403, 'FORBIDDEN', '수정 권한이 없습니다.')
  }

  const schema = z.object({
    title: z.string().min(1).max(200).optional(),
    body: z.string().min(1).optional(),
  })

  const parsed = await parseBody(req, schema)
  if (parsed.error) return parsed.error

  const { data, error } = await supabase
    .from('updates')
    .update(parsed.data)
    .eq('id', id)
    .select('id, title, body, updated_at')
    .single()

  if (error || !data) return errorResponse(500, 'INTERNAL_ERROR', '업데이트 수정 실패')

  return successResponse(data)
})

// DELETE /api/v1/updates/:id
export const DELETE = withAuth(async (req: AuthedRequest, { params }) => {
  const { id } = await params

  const { data: update } = await supabase
    .from('updates')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!update) return errorResponse(404, 'NOT_FOUND', '업데이트를 찾을 수 없습니다.')
  if (update.user_id !== req.user.sub && req.user.role !== 'admin') {
    return errorResponse(403, 'FORBIDDEN', '삭제 권한이 없습니다.')
  }

  const { error } = await supabase.from('updates').delete().eq('id', id)
  if (error) return errorResponse(500, 'INTERNAL_ERROR', '업데이트 삭제 실패')

  return noContentResponse()
})
