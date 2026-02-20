import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, successResponse, errorResponse } from '@/lib/auth'
import { parseBody } from '@/lib/validate'

// GET /api/v1/users/me
export const GET = withAuth(async (req: AuthedRequest) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, avatar_url, bio, provider, role, created_at, updated_at')
    .eq('id', req.user.sub)
    .single()

  if (error || !data) return errorResponse(404, 'NOT_FOUND', '사용자를 찾을 수 없습니다.')

  return successResponse(data)
})

// PATCH /api/v1/users/me
export const PATCH = withAuth(async (req: AuthedRequest) => {
  const schema = z.object({
    name: z.string().min(1).max(50).optional(),
    avatar_url: z.string().url().optional(),
    bio: z.string().max(200).optional(),
  })

  const parsed = await parseBody(req, schema)
  if (parsed.error) return parsed.error

  const { data, error } = await supabase
    .from('users')
    .update(parsed.data)
    .eq('id', req.user.sub)
    .select('id, email, name, avatar_url, bio, role, updated_at')
    .single()

  if (error || !data) return errorResponse(500, 'INTERNAL_ERROR', '프로필 수정 실패')

  return successResponse(data)
})
