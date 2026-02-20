import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAdmin, AuthedRequest, successResponse, errorResponse } from '@/lib/auth'
import { parseBody } from '@/lib/validate'

// PATCH /api/v1/admin/users/:id
export const PATCH = withAdmin(async (req: AuthedRequest, { params }) => {
  const { id } = await params

  const schema = z.object({
    role: z.enum(['user', 'admin']).optional(),
  })

  const parsed = await parseBody(req, schema)
  if (parsed.error) return parsed.error

  const { data, error } = await supabase
    .from('users')
    .update(parsed.data)
    .eq('id', id)
    .select('id, email, name, role, updated_at')
    .single()

  if (error || !data) return errorResponse(404, 'NOT_FOUND', '사용자를 찾을 수 없습니다.')

  return successResponse(data)
})
