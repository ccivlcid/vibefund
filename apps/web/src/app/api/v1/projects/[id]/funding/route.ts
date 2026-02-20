import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, successResponse, errorResponse } from '@/lib/auth'
import { parseBody } from '@/lib/validate'

// GET /api/v1/projects/:id/funding
export async function GET(_req: NextRequest, { params }: { params: Promise<Record<string, string>> }) {
  const { id: projectId } = await params

  const { data, error } = await supabase
    .from('funding_progress')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (error || !data) return errorResponse(404, 'NOT_FOUND', '펀딩 정보를 찾을 수 없습니다.')

  return successResponse(data)
}

// PUT /api/v1/projects/:id/funding
export const PUT = withAuth(async (req: AuthedRequest, { params }) => {
  const { id: projectId } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single()

  if (!project) return errorResponse(404, 'PROJECT_NOT_FOUND', '프로젝트를 찾을 수 없습니다.')
  if (project.user_id !== req.user.sub && req.user.role !== 'admin') {
    return errorResponse(403, 'FORBIDDEN', '펀딩 설정 권한이 없습니다.')
  }

  const schema = z.object({
    goal_amount: z.number().int().min(100000, '목표 금액은 최소 100,000원 이상'),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식: YYYY-MM-DD'),
    min_pledge_amount: z.number().int().min(0).default(1000),
  })

  const parsed = await parseBody(req, schema)
  if (parsed.error) return parsed.error

  const { data, error } = await supabase
    .from('fundings')
    .upsert({ project_id: projectId, ...parsed.data }, { onConflict: 'project_id' })
    .select()
    .single()

  if (error || !data) return errorResponse(500, 'INTERNAL_ERROR', '펀딩 설정 저장 실패')

  return successResponse(data)
})
