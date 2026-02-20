import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, successResponse, errorResponse } from '@/lib/auth'
import { parseBody } from '@/lib/validate'

type Params = { params: Promise<Record<string, string>> }

const MESSAGE_LIMIT = 100

// GET /api/v1/community/chat/rooms/:roomId/messages?limit=50&before=<created_at>
export async function GET(req: NextRequest, { params }: Params) {
  const { roomId } = await params

  const { searchParams } = new URL(req.url)
  const limit = Math.min(MESSAGE_LIMIT, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))
  const before = searchParams.get('before') ?? undefined

  let query = supabase
    .from('chat_messages')
    .select(
      'id, room_id, body, created_at, user:users!user_id (id, name, avatar_url)',
      { count: 'exact' }
    )
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) {
    query = query.lt('created_at', before)
  }

  const { data: rows, error, count } = await query

  if (error) return errorResponse(500, 'INTERNAL_ERROR', '메시지 조회 실패')

  const messages = (rows ?? []).reverse()
  return successResponse({
    messages,
    total: count ?? 0,
  })
}

// POST /api/v1/community/chat/rooms/:roomId/messages — 메시지 전송 (로그인 필요)
export const POST = withAuth(async (req: AuthedRequest, ctx: Params) => {
  const { roomId } = await ctx.params

  const schema = z.object({
    body: z.string().min(1, '내용을 입력해 주세요.').max(2000),
  })
  const parsed = await parseBody(req, schema)
  if (parsed.error) return parsed.error

  const { data: room } = await supabase.from('chat_rooms').select('id').eq('id', roomId).single()
  if (!room) return errorResponse(404, 'NOT_FOUND', '채팅방을 찾을 수 없습니다.')

  const { data: message, error } = await supabase
    .from('chat_messages')
    .insert({
      room_id: roomId,
      user_id: req.user.sub,
      body: parsed.data.body.trim(),
    })
    .select('id, room_id, body, created_at, user:users!user_id (id, name, avatar_url)')
    .single()

  if (error || !message) return errorResponse(500, 'INTERNAL_ERROR', '메시지 전송 실패')
  return successResponse(message, 201)
})
