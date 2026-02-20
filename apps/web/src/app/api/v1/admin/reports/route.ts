import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { withAdmin, errorResponse, successResponse } from '@/lib/auth'

// GET /api/v1/admin/reports — 신고 접수 목록 (F-054)
export const GET = withAdmin(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'pending'

  let query = supabase
    .from('comment_reports')
    .select(`
      id, comment_id, reason, status, created_at,
      comment:comments!comment_id (id, body, project_id, user_id, created_at),
      reporter:users!reporter_user_id (id, name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (status) query = query.eq('status', status)

  const { data: rows, error } = await query

  if (error) return errorResponse(500, 'INTERNAL_ERROR', '신고 목록 조회 실패')

  const projectIds = [...new Set(
    (rows ?? [])
      .map((r: { comment?: { project_id?: string } | null }) => r.comment?.project_id)
      .filter(Boolean) as string[]
  )]
  const projects: Record<string, { id: string; title: string }> = {}
  if (projectIds.length > 0) {
    const { data: projRows } = await supabase.from('projects').select('id, title').in('id', projectIds)
    for (const p of projRows ?? []) {
      projects[p.id] = p
    }
  }

  const list = (rows ?? []).map((r: Record<string, unknown>) => {
    const comment = r.comment as { project_id?: string; body?: string; created_at?: string } | null
    return {
      ...r,
      project_title: comment?.project_id ? projects[comment.project_id]?.title ?? null : null,
    }
  })

  return successResponse(list)
})
