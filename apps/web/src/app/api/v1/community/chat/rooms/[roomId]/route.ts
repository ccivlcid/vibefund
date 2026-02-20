import { supabase } from '@/lib/supabase'
import { successResponse, errorResponse } from '@/lib/auth'

type Params = { params: Promise<Record<string, string>> }

// GET /api/v1/community/chat/rooms/:roomId — 채팅방 단일 조회
export async function GET(_req: Request, { params }: Params) {
  const { roomId } = await params

  const { data: room, error } = await supabase
    .from('chat_rooms')
    .select('id, key, name, created_at')
    .eq('id', roomId)
    .single()

  if (error || !room) return errorResponse(404, 'NOT_FOUND', '채팅방을 찾을 수 없습니다.')
  return successResponse(room)
}
