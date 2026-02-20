import { supabase } from '@/lib/supabase'
import { successResponse, errorResponse } from '@/lib/auth'

// GET /api/v1/community/chat/rooms — 채팅방 목록
export async function GET() {
  const { data, error } = await supabase
    .from('chat_rooms')
    .select('id, key, name, created_at')
    .order('key', { ascending: true })

  if (error) return errorResponse(500, 'INTERNAL_ERROR', '채팅방 목록 조회 실패')
  return successResponse(data ?? [])
}
