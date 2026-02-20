import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, successResponse, errorResponse, noContentResponse } from '@/lib/auth'
import { parseBody } from '@/lib/validate'

// PATCH /api/v1/comments/:id
export const PATCH = withAuth(async (req: AuthedRequest, { params }) => {
  const { id } = await params

  const { data: comment } = await supabase
    .from('comments')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!comment) return errorResponse(404, 'COMMENT_NOT_FOUND', '댓글을 찾을 수 없습니다.')
  if (comment.user_id !== req.user.sub) {
    return errorResponse(403, 'FORBIDDEN', '수정 권한이 없습니다.')
  }

  const parsed = await parseBody(req, z.object({ body: z.string().min(1).max(1000) }))
  if (parsed.error) return parsed.error

  const { data, error } = await supabase
    .from('comments')
    .update({ body: parsed.data.body })
    .eq('id', id)
    .select('id, body, parent_id, updated_at, user:users!user_id (id, name)')
    .single()

  if (error || !data) return errorResponse(500, 'INTERNAL_ERROR', '댓글 수정 실패')

  return successResponse(data)
})

// DELETE /api/v1/comments/:id
export const DELETE = withAuth(async (req: AuthedRequest, { params }) => {
  const { id } = await params

  const { data: comment } = await supabase
    .from('comments')
    .select('user_id, project_id')
    .eq('id', id)
    .single()

  if (!comment) return errorResponse(404, 'COMMENT_NOT_FOUND', '댓글을 찾을 수 없습니다.')

  const isOwner = comment.user_id === req.user.sub
  const isAdmin = req.user.role === 'admin'

  if (!isOwner && !isAdmin) {
    const { data: project } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', comment.project_id)
      .single()

    if (!project || project.user_id !== req.user.sub) {
      return errorResponse(403, 'FORBIDDEN', '삭제 권한이 없습니다.')
    }
  }

  const { error } = await supabase.from('comments').delete().eq('id', id)
  if (error) return errorResponse(500, 'INTERNAL_ERROR', '댓글 삭제 실패')

  return noContentResponse()
})
