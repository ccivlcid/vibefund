import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, successResponse, errorResponse, paginatedResponse } from '@/lib/auth'
import { parseBody, getPaginationParams } from '@/lib/validate'

// GET /api/v1/projects/:id/updates
export async function GET(req: NextRequest, { params }: { params: Promise<Record<string, string>> }) {
  const { id: projectId } = await params
  const { page, limit, offset } = getPaginationParams(new URL(req.url).searchParams)

  const { data, error, count } = await supabase
    .from('updates')
    .select('id, title, body, created_at, user:users!user_id (id, name)', { count: 'exact' })
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return errorResponse(500, 'INTERNAL_ERROR', '업데이트 조회 실패')

  return paginatedResponse(data ?? [], { page, limit, total: count ?? 0 })
}

// POST /api/v1/projects/:id/updates
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
    return errorResponse(403, 'FORBIDDEN', '업데이트 게시 권한이 없습니다.')
  }

  const schema = z.object({
    title: z.string().min(1).max(200),
    body: z.string().min(1),
  })

  const parsed = await parseBody(req, schema)
  if (parsed.error) return parsed.error

  const { data, error } = await supabase
    .from('updates')
    .insert({ project_id: projectId, user_id: req.user.sub, ...parsed.data })
    .select('id, title, body, created_at, user:users!user_id (id, name)')
    .single()

  if (error || !data) return errorResponse(500, 'INTERNAL_ERROR', '업데이트 게시 실패')

  return successResponse(data, 201)
})
