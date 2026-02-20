import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, successResponse, errorResponse, paginatedResponse } from '@/lib/auth'
import { parseBody, getPaginationParams } from '@/lib/validate'

// GET /api/v1/projects/:id/comments
export async function GET(req: NextRequest, { params }: { params: Promise<Record<string, string>> }) {
  const { id: projectId } = await params
  const { searchParams } = new URL(req.url)
  const { page, limit, offset } = getPaginationParams(searchParams)
  const parentId = searchParams.get('parent_id')

  let query = supabase
    .from('comments')
    .select(
      'id, body, parent_id, created_at, updated_at, user:users!user_id (id, name, avatar_url)',
      { count: 'exact' }
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (parentId === 'null' || parentId === null) {
    query = query.is('parent_id', null)
  } else {
    query = query.eq('parent_id', parentId)
  }

  const { data, error, count } = await query

  if (error) return errorResponse(500, 'INTERNAL_ERROR', '댓글 조회 실패')

  return paginatedResponse(data ?? [], { page, limit, total: count ?? 0 })
}

// POST /api/v1/projects/:id/comments
export const POST = withAuth(async (req: AuthedRequest, { params }) => {
  const { id: projectId } = await params

  const schema = z.object({
    body: z.string().min(1).max(1000),
    parent_id: z.string().uuid().nullable().optional(),
  })

  const parsed = await parseBody(req, schema)
  if (parsed.error) return parsed.error

  const { data, error } = await supabase
    .from('comments')
    .insert({
      project_id: projectId,
      user_id: req.user.sub,
      body: parsed.data.body,
      parent_id: parsed.data.parent_id ?? null,
    })
    .select('id, body, parent_id, created_at, user:users!user_id (id, name, avatar_url)')
    .single()

  if (error || !data) return errorResponse(500, 'INTERNAL_ERROR', '댓글 작성 실패')

  return successResponse(data, 201)
})
