import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, successResponse, errorResponse } from '@/lib/auth'
import { parseBody } from '@/lib/validate'

// GET /api/v1/projects/:id/funding
export async function GET(_req: NextRequest, { params }: { params: Promise<Record<string, string>> }) {
  const { id: projectId } = await params

  const { data, error } = await supabase
    .from('funding_progress')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (error || !data) return errorResponse(404, 'NOT_FOUND', '펀딩 정보를 찾을 수 없습니다.')

  return successResponse(data)
}

const pledgeSchema = z.object({
  reward_id: z.string().uuid().nullable().optional(),
  amount: z.number().int().min(1000, '최소 1,000원 이상 후원 가능합니다.'),
})

// POST /api/v1/projects/:id/funding — 후원하기 (pledge 생성)
export const POST = withAuth(async (req: AuthedRequest, { params }) => {
  const { id: projectId } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('id, user_id')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single()

  if (!project) return errorResponse(404, 'PROJECT_NOT_FOUND', '프로젝트를 찾을 수 없습니다.')
  if (project.user_id === req.user.sub) {
    return errorResponse(400, 'OWN_PROJECT', '자신의 프로젝트에는 후원할 수 없습니다.')
  }

  const parsed = await parseBody(req, pledgeSchema)
  if (parsed.error) return parsed.error

  const { data: funding } = await supabase
    .from('fundings')
    .select('id, min_pledge_amount')
    .eq('project_id', projectId)
    .single()

  if (!funding) return errorResponse(404, 'NOT_FOUND', '펀딩 정보가 없습니다.')
  if (parsed.data.amount < (funding.min_pledge_amount ?? 0)) {
    return errorResponse(400, 'MIN_AMOUNT', `최소 ${funding.min_pledge_amount ?? 0}원 이상 후원해 주세요.`)
  }

  const { data: pledge, error } = await supabase
    .from('pledges')
    .insert({
      project_id: projectId,
      user_id: req.user.sub,
      reward_id: parsed.data.reward_id ?? null,
      amount: parsed.data.amount,
      status: 'completed', // MVP: 결제 없이 완료 처리
    })
    .select('id, amount, status, created_at')
    .single()

  if (error || !pledge) return errorResponse(500, 'INTERNAL_ERROR', '후원 처리에 실패했습니다.')

  return successResponse(pledge, 201)
})

// PUT /api/v1/projects/:id/funding — 펀딩 목표/마감일 설정 (소유자)
export const PUT = withAuth(async (req: AuthedRequest, { params }) => {
  const { id: projectId } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single()

  if (!project) return errorResponse(404, 'PROJECT_NOT_FOUND', '프로젝트를 찾을 수 없습니다.')
  if (project.user_id !== req.user.sub && req.user.role !== 'admin') {
    return errorResponse(403, 'FORBIDDEN', '펀딩 설정 권한이 없습니다.')
  }

  const schema = z.object({
    goal_amount: z.number().int().min(100000, '목표 금액은 최소 100,000원 이상'),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식: YYYY-MM-DD'),
    min_pledge_amount: z.number().int().min(0).default(1000),
  })

  const parsed = await parseBody(req, schema)
  if (parsed.error) return parsed.error

  const { data, error } = await supabase
    .from('fundings')
    .upsert({ project_id: projectId, ...parsed.data }, { onConflict: 'project_id' })
    .select()
    .single()

  if (error || !data) return errorResponse(500, 'INTERNAL_ERROR', '펀딩 설정 저장 실패')

  return successResponse(data)
})
