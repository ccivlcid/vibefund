import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, successResponse, errorResponse } from '@/lib/auth'
import { parseBody } from '@/lib/validate'

const rewardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1),
  amount: z.number().int().min(0),
  type: z.enum(['beta', 'lifetime', 'subscription_discount']),
})

// GET /api/v1/projects/:id/rewards
export async function GET(_req: NextRequest, { params }: { params: Promise<Record<string, string>> }) {
  const { id: projectId } = await params

  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .eq('project_id', projectId)
    .order('amount', { ascending: true })

  if (error) return errorResponse(500, 'INTERNAL_ERROR', '리워드 조회 실패')

  return successResponse(data ?? [])
}

// POST /api/v1/projects/:id/rewards
export const POST = withAuth(async (req: AuthedRequest, { params }) => {
  const { id: projectId } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single()

  if (!project) return errorResponse(404, 'PROJECT_NOT_FOUND', '프로젝트를 찾을 수 없습니다.')
  if (project.user_id !== req.user.sub) {
    return errorResponse(403, 'FORBIDDEN', '리워드 추가 권한이 없습니다.')
  }

  const parsed = await parseBody(req, rewardSchema)
  if (parsed.error) return parsed.error

  const { data, error } = await supabase
    .from('rewards')
    .insert({ project_id: projectId, ...parsed.data })
    .select()
    .single()

  if (error || !data) return errorResponse(500, 'INTERNAL_ERROR', '리워드 생성 실패')

  return successResponse(data, 201)
})
