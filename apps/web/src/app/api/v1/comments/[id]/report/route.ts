import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, successResponse, errorResponse } from '@/lib/auth'
import { parseBody } from '@/lib/validate'

const bodySchema = z.object({
  reason: z.string().max(500).optional(),
})

// POST /api/v1/comments/:id/report — 댓글 신고 (F-054)
export const POST = withAuth(async (req: AuthedRequest, { params }) => {
  const { id: commentId } = await params

  const { data: comment } = await supabase
    .from('comments')
    .select('id')
    .eq('id', commentId)
    .single()

  if (!comment) return errorResponse(404, 'NOT_FOUND', '댓글을 찾을 수 없습니다.')

  const parsed = await parseBody(req, bodySchema)
  if (parsed.error) return parsed.error

  const { data: existing } = await supabase
    .from('comment_reports')
    .select('id')
    .eq('comment_id', commentId)
    .eq('reporter_user_id', req.user.sub)
    .single()

  if (existing) return errorResponse(400, 'ALREADY_REPORTED', '이미 신고한 댓글입니다.')

  const { error } = await supabase
    .from('comment_reports')
    .insert({
      comment_id: commentId,
      reporter_user_id: req.user.sub,
      reason: parsed.data.reason ?? null,
      status: 'pending',
    })

  if (error) return errorResponse(500, 'INTERNAL_ERROR', '신고 접수에 실패했습니다.')

  return successResponse({ ok: true }, 201)
})
