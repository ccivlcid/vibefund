import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, successResponse, errorResponse } from '@/lib/auth'
import { parseBody } from '@/lib/validate'

const putSchema = z.object({
  member_ids: z.array(z.string().uuid()).min(1, '최소 1명 이상 선택해 주세요'),
})

type Params = { params: Promise<Record<string, string>> }

// GET /api/v1/projects/:id/ai-board/selections — 이 프로젝트에 선택된 멤버 목록
export async function GET(_req: NextRequest, { params }: Params) {
  const { id: projectId } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single()

  if (!project) return errorResponse(404, 'PROJECT_NOT_FOUND', '프로젝트를 찾을 수 없습니다.')

  const { data, error } = await supabase
    .from('project_ai_board_selections')
    .select(`
      ai_board_member_id,
      weight_percent,
      ai_board_members (id, key, display_name, perspective, default_weight_percent)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) return errorResponse(500, 'INTERNAL_ERROR', 'AI 이사회 선택 목록 조회 실패')

  return successResponse(data ?? [])
}

// PUT /api/v1/projects/:id/ai-board/selections — 선택 저장 (본인 프로젝트만)
export const PUT = withAuth(async (req: AuthedRequest, { params }: Params) => {
  const { id: projectId } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single()

  if (!project) return errorResponse(404, 'PROJECT_NOT_FOUND', '프로젝트를 찾을 수 없습니다.')
  if (project.user_id !== req.user.sub && req.user.role !== 'admin') {
    return errorResponse(403, 'FORBIDDEN', '수정 권한이 없습니다.')
  }

  const parsed = await parseBody(req, putSchema)
  if (parsed.error) return parsed.error

  const { member_ids } = parsed.data

  await supabase.from('project_ai_board_selections').delete().eq('project_id', projectId)

  if (member_ids.length > 0) {
    const rows = member_ids.map((ai_board_member_id) => ({
      project_id: projectId,
      ai_board_member_id,
      weight_percent: null,
    }))
    const { error: insertError } = await supabase.from('project_ai_board_selections').insert(rows)
    if (insertError) return errorResponse(500, 'INTERNAL_ERROR', 'AI 이사회 선택 저장 실패')
  }

  const { data: updated } = await supabase
    .from('project_ai_board_selections')
    .select('ai_board_member_id')
    .eq('project_id', projectId)

  return successResponse(updated ?? [])
})
