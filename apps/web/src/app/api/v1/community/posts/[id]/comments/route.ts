import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, successResponse, errorResponse } from '@/lib/auth'
import { parseBody } from '@/lib/validate'

type Params = { params: Promise<Record<string, string>> }

// GET /api/v1/community/posts/:id/comments — 댓글 목록
export async function GET(req: NextRequest, { params }: Params) {
  const { id: postId } = await params

  const { data: post } = await supabase.from('community_posts').select('id').eq('id', postId).single()
  if (!post) return errorResponse(404, 'NOT_FOUND', '게시글을 찾을 수 없습니다.')

  const { data: comments, error } = await supabase
    .from('community_post_comments')
    .select(`
      id, post_id, parent_id, body, created_at, updated_at,
      user:users!user_id (id, name, avatar_url)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error) return errorResponse(500, 'INTERNAL_ERROR', '댓글 조회 실패')
  return successResponse(comments ?? [])
}

// POST /api/v1/community/posts/:id/comments — 댓글 작성 (로그인 필요)
export const POST = withAuth(async (req: AuthedRequest, ctx: Params) => {
  const { id: postId } = await ctx.params

  const schema = z.object({
    body: z.string().min(1, '내용을 입력해 주세요.').max(1000),
    parent_id: z.string().uuid().nullable().optional(),
  })
  const parsed = await parseBody(req, schema)
  if (parsed.error) return parsed.error

  const { data: post } = await supabase.from('community_posts').select('id').eq('id', postId).single()
  if (!post) return errorResponse(404, 'NOT_FOUND', '게시글을 찾을 수 없습니다.')

  const { data: comment, error } = await supabase
    .from('community_post_comments')
    .insert({
      post_id: postId,
      user_id: req.user.sub,
      body: parsed.data.body.trim(),
      parent_id: parsed.data.parent_id ?? null,
    })
    .select(`
      id, post_id, parent_id, body, created_at, updated_at,
      user:users!user_id (id, name, avatar_url)
    `)
    .single()

  if (error || !comment) return errorResponse(500, 'INTERNAL_ERROR', '댓글 작성 실패')
  return successResponse(comment, 201)
})
