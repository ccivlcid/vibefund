import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { successResponse, errorResponse } from '@/lib/auth'

export interface AiBoardMemberDto {
  id: string
  key: string
  display_name: string
  perspective: string | null
  default_weight_percent: number
  sort_order: number
}

// GET /api/v1/ai-board/members — 활성 AI 이사회 멤버 풀 (공개)
export async function GET() {
  const { data, error } = await supabase
    .from('ai_board_members')
    .select('id, key, display_name, perspective, default_weight_percent, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) return errorResponse(500, 'INTERNAL_ERROR', 'AI 이사회 멤버 목록 조회 실패')

  return successResponse((data ?? []) as AiBoardMemberDto[])
}
