import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAdmin, AuthedRequest, successResponse, errorResponse } from '@/lib/auth'
import { parseBody } from '@/lib/validate'

const patchSchema = z.object({
  action: z.enum(['resolve_dismiss', 'resolve_delete']),
})

// PATCH /api/v1/admin/reports/:id — 신고 처리 (유지 또는 댓글 삭제)
export const PATCH = withAdmin(async (req: AuthedRequest, { params }) => {
  const { id: reportId } = await params

  const parsed = await parseBody(req, patchSchema)
  if (parsed.error) return parsed.error

  const { data: report } = await supabase
    .from('comment_reports')
    .select('id, comment_id, status')
    .eq('id', reportId)
    .single()

  if (!report) return errorResponse(404, 'NOT_FOUND', '신고를 찾을 수 없습니다.')
  if (report.status !== 'pending') return errorResponse(400, 'ALREADY_RESOLVED', '이미 처리된 신고입니다.')

  if (parsed.data.action === 'resolve_delete') {
    const { error: delErr } = await supabase.from('comments').delete().eq('id', report.comment_id)
    if (delErr) return errorResponse(500, 'INTERNAL_ERROR', '댓글 삭제 실패')
    await supabase.from('comment_reports').update({ status: 'resolved_deleted' }).eq('id', reportId)
  } else {
    await supabase.from('comment_reports').update({ status: 'resolved_dismissed' }).eq('id', reportId)
  }

  return successResponse({ ok: true })
})
