import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, successResponse, errorResponse, noContentResponse } from '@/lib/auth'
import { parseBody } from '@/lib/validate'

// PATCH /api/v1/projects/:id/rewards/:rewardId
export const PATCH = withAuth(async (req: AuthedRequest, { params }) => {
  const { id: projectId, rewardId } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .single()

  if (!project) return errorResponse(404, 'PROJECT_NOT_FOUND', '프로젝트를 찾을 수 없습니다.')
  if (project.user_id !== req.user.sub) {
    return errorResponse(403, 'FORBIDDEN', '수정 권한이 없습니다.')
  }

  const schema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().min(1).optional(),
    amount: z.number().int().min(0).optional(),
    type: z.enum(['beta', 'lifetime', 'subscription_discount', 'supporter']).optional(),
  })

  const parsed = await parseBody(req, schema)
  if (parsed.error) return parsed.error

  const { data, error } = await supabase
    .from('rewards')
    .update(parsed.data)
    .eq('id', rewardId)
    .eq('project_id', projectId)
    .select()
    .single()

  if (error || !data) return errorResponse(404, 'NOT_FOUND', '리워드를 찾을 수 없습니다.')

  return successResponse(data)
})

// DELETE /api/v1/projects/:id/rewards/:rewardId
export const DELETE = withAuth(async (req: AuthedRequest, { params }) => {
  const { id: projectId, rewardId } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .single()

  if (!project) return errorResponse(404, 'PROJECT_NOT_FOUND', '프로젝트를 찾을 수 없습니다.')
  if (project.user_id !== req.user.sub) {
    return errorResponse(403, 'FORBIDDEN', '삭제 권한이 없습니다.')
  }

  const { error } = await supabase
    .from('rewards')
    .delete()
    .eq('id', rewardId)
    .eq('project_id', projectId)

  if (error) return errorResponse(500, 'INTERNAL_ERROR', '리워드 삭제 실패')

  return noContentResponse()
})
