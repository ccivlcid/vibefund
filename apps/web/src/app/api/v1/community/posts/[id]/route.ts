import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, successResponse, errorResponse } from '@/lib/auth'
import { parseBody } from '@/lib/validate'

type Params = { params: Promise<Record<string, string>> }

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(10000).optional(),
})

// GET /api/v1/community/posts/:id — 단일 게시글 상세
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params

  const { data: post, error } = await supabase
    .from('community_posts')
    .select(`
      id, board, title, body, created_at, updated_at, user_id,
      user:users!user_id (id, name, avatar_url)
    `)
    .eq('id', id)
    .single()

  if (error || !post) return errorResponse(404, 'NOT_FOUND', '게시글을 찾을 수 없습니다.')

  return successResponse(post)
}

// PATCH /api/v1/community/posts/:id — 글 수정 (작성자만)
export const PATCH = withAuth(async (req: AuthedRequest, ctx: Params) => {
  const { id } = await ctx.params

  const { data: post, error: fetchErr } = await supabase
    .from('community_posts')
    .select('id, user_id')
    .eq('id', id)
    .single()

  if (fetchErr || !post) return errorResponse(404, 'NOT_FOUND', '게시글을 찾을 수 없습니다.')
  if ((post as { user_id: string }).user_id !== req.user.sub) {
    return errorResponse(403, 'FORBIDDEN', '본인 글만 수정할 수 있습니다.')
  }

  const parsed = await parseBody(req, updateSchema)
  if (parsed.error) return parsed.error

  const updates: { title?: string; body?: string } = {}
  if (parsed.data.title !== undefined) updates.title = parsed.data.title
  if (parsed.data.body !== undefined) updates.body = parsed.data.body
  if (Object.keys(updates).length === 0) return successResponse(post)

  const { data: updated, error } = await supabase
    .from('community_posts')
    .update(updates)
    .eq('id', id)
    .select(`id, board, title, body, created_at, updated_at, user:users!user_id (id, name, avatar_url)`)
    .single()

  if (error || !updated) return errorResponse(500, 'INTERNAL_ERROR', '수정 실패')
  return successResponse(updated)
})

// DELETE /api/v1/community/posts/:id — 글 삭제 (작성자 또는 관리자)
export const DELETE = withAuth(async (req: AuthedRequest, ctx: Params) => {
  const { id } = await ctx.params

  const { data: post, error: fetchErr } = await supabase
    .from('community_posts')
    .select('id, user_id')
    .eq('id', id)
    .single()

  if (fetchErr || !post) return errorResponse(404, 'NOT_FOUND', '게시글을 찾을 수 없습니다.')

  const row = post as { user_id: string }
  const isAuthor = row.user_id === req.user.sub
  const isAdmin = req.user.role === 'admin'
  if (!isAuthor && !isAdmin) return errorResponse(403, 'FORBIDDEN', '삭제 권한이 없습니다.')

  const { error } = await supabase.from('community_posts').delete().eq('id', id)
  if (error) return errorResponse(500, 'INTERNAL_ERROR', '삭제 실패')
  return successResponse({ deleted: true })
})
