import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, successResponse, errorResponse } from '@/lib/auth'
import { parseBody } from '@/lib/validate'

type Params = { params: Promise<Record<string, string>> }

const postSchema = z.object({
  vote: z.enum(['up', 'down']),
})

// GET /api/v1/projects/:id/votes — 따봉/비추 개수 + (인증 시) 내 투표
export async function GET(req: NextRequest, { params }: Params) {
  const { id: projectId } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single()

  if (!project) return errorResponse(404, 'PROJECT_NOT_FOUND', '프로젝트를 찾을 수 없습니다.')

  const { data: votes } = await supabase
    .from('project_votes')
    .select('vote, user_id')
    .eq('project_id', projectId)

  const list = votes ?? []
  const up_count = list.filter((v: { vote: string }) => v.vote === 'up').length
  const down_count = list.filter((v: { vote: string }) => v.vote === 'down').length

  let my_vote: 'up' | 'down' | null = null
  const token = req.cookies.get('token')?.value ?? req.headers.get('authorization')?.replace('Bearer ', '')
  if (token) {
    try {
      const { verifyToken } = await import('@/lib/jwt')
      const payload = await verifyToken(token)
      const myRow = list.find((v: { user_id: string }) => v.user_id === payload.sub)
      if (myRow) my_vote = (myRow as { vote: string }).vote as 'up' | 'down'
    } catch {
      // ignore invalid token
    }
  }

  return successResponse({ up_count, down_count, my_vote })
}

// POST /api/v1/projects/:id/votes — 따봉/비추 투표 (토글: 같은 걸 다시 누르면 취소)
export const POST = withAuth(async (req: AuthedRequest, { params }: Params) => {
  const { id: projectId } = await params

  const parsed = await parseBody(req, postSchema)
  if (parsed.error) return parsed.error

  const { vote } = parsed.data

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single()

  if (!project) return errorResponse(404, 'PROJECT_NOT_FOUND', '프로젝트를 찾을 수 없습니다.')

  const { data: existing } = await supabase
    .from('project_votes')
    .select('id, vote')
    .eq('project_id', projectId)
    .eq('user_id', req.user.sub)
    .maybeSingle()

  if (existing) {
    if (existing.vote === vote) {
      await supabase.from('project_votes').delete().eq('id', existing.id)
      const { data: votes } = await supabase.from('project_votes').select('vote').eq('project_id', projectId)
      const list = votes ?? []
      return successResponse({
        up_count: list.filter((v: { vote: string }) => v.vote === 'up').length,
        down_count: list.filter((v: { vote: string }) => v.vote === 'down').length,
        my_vote: null,
        message: '투표를 취소했어요',
      })
    }
    const { error: updateErr } = await supabase
      .from('project_votes')
      .update({ vote })
      .eq('id', existing.id)
    if (updateErr) return errorResponse(500, 'INTERNAL_ERROR', '투표 변경 실패')
  } else {
    const { error: insertErr } = await supabase.from('project_votes').insert({
      project_id: projectId,
      user_id: req.user.sub,
      vote,
    })
    if (insertErr) return errorResponse(500, 'INTERNAL_ERROR', '투표 저장 실패')
  }

  const { data: votes } = await supabase.from('project_votes').select('vote').eq('project_id', projectId)
  const list = votes ?? []
  const my_vote = vote as 'up' | 'down'
  return successResponse({
    up_count: list.filter((v: { vote: string }) => v.vote === 'up').length,
    down_count: list.filter((v: { vote: string }) => v.vote === 'down').length,
    my_vote,
  })
})
