import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAdmin, AuthedRequest, successResponse, errorResponse } from '@/lib/auth'
import { parseBody } from '@/lib/validate'

// PATCH /api/v1/admin/projects/:id/approval
export const PATCH = withAdmin(async (req: AuthedRequest, { params }) => {
  const { id } = await params

  const schema = z.object({
    approval_status: z.enum(['approved', 'rejected', 'hidden']),
    rejection_reason: z.string().min(1).optional(),
  }).refine(
    (d) => d.approval_status !== 'rejected' || !!d.rejection_reason,
    { message: '반려 시 반려 사유를 입력해야 합니다.', path: ['rejection_reason'] }
  )

  const parsed = await parseBody(req, schema)
  if (parsed.error) return parsed.error

  const { data, error } = await supabase
    .from('projects')
    .update({
      approval_status: parsed.data.approval_status,
      rejection_reason: parsed.data.rejection_reason ?? null,
    })
    .eq('id', id)
    .select('id, title, approval_status, rejection_reason, updated_at')
    .single()

  if (error || !data) return errorResponse(404, 'PROJECT_NOT_FOUND', '프로젝트를 찾을 수 없습니다.')

  return successResponse(data)
})
