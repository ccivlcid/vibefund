import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, successResponse, errorResponse, paginatedResponse } from '@/lib/auth'
import { parseBody } from '@/lib/validate'
import { getPaginationParams } from '@/lib/validate'

const boardSchema = z.enum(['discussion', 'learning'])

const postSchema = z.object({
  board: boardSchema,
  title: z.string().min(1, '제목을 입력해 주세요.').max(200),
  body: z.string().min(1, '내용을 입력해 주세요.').max(10000),
})

// GET /api/v1/community/posts?board=discussion|learning&page=1&limit=20
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const boardParam = searchParams.get('board')
  const boardResult = boardSchema.safeParse(boardParam)
  if (!boardResult.success) {
    return errorResponse(400, 'VALIDATION_ERROR', 'board는 discussion 또는 learning이어야 합니다.')
  }
  const board = boardResult.data
  const { page, limit, offset } = getPaginationParams(searchParams)

  const { data: rows, error, count } = await supabase
    .from('community_posts')
    .select(
      `
      id, board, title, body, created_at, updated_at,
      user:users!user_id (id, name, avatar_url)
    `,
      { count: 'exact' }
    )
    .eq('board', board)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return errorResponse(500, 'INTERNAL_ERROR', '게시글 목록 조회 실패')

  return paginatedResponse(rows ?? [], { page, limit, total: count ?? 0 })
}

// POST /api/v1/community/posts — 글 작성 (로그인 필요)
export const POST = withAuth(async (req: AuthedRequest) => {
  const parsed = await parseBody(req, postSchema)
  if (parsed.error) return parsed.error

  const { board, title, body } = parsed.data

  const { data: post, error } = await supabase
    .from('community_posts')
    .insert({ board, title, body, user_id: req.user.sub })
    .select(`
      id, board, title, body, created_at, updated_at,
      user:users!user_id (id, name, avatar_url)
    `)
    .single()

  if (error || !post) return errorResponse(500, 'INTERNAL_ERROR', '게시글 저장 실패')

  return successResponse(post, 201)
})
