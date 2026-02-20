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
type PledgeBody = z.infer<typeof pledgeSchema>

const fundingPutSchema = z.object({
  goal_amount: z.number().int().min(100000, '목표 금액은 최소 100,000원 이상'),
  deadline: z
    .string()
    .min(1, '마감일을 입력해 주세요')
    .transform((s: string) => {
      const trimmed = s.trim()
      const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)
      return match ? match[1] : trimmed
    })
    .refine((s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s), '날짜 형식은 YYYY-MM-DD여야 합니다'),
  min_pledge_amount: z.number().int().min(0).default(1000),
})
type FundingPutBody = z.infer<typeof fundingPutSchema>

// POST /api/v1/projects/:id/funding — 후원하기 (잔액 차감 후 pledge 생성)
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

  const parsed = await parseBody<PledgeBody>(req, pledgeSchema)
  if (parsed.error) return parsed.error
  const body = parsed.data

  const { data: funding } = await supabase
    .from('fundings')
    .select('id, min_pledge_amount')
    .eq('project_id', projectId)
    .single()

  if (!funding) return errorResponse(404, 'NOT_FOUND', '펀딩 정보가 없습니다.')
  if (body.amount < (funding.min_pledge_amount ?? 0)) {
    return errorResponse(400, 'MIN_AMOUNT', `최소 ${funding.min_pledge_amount ?? 0}원 이상 후원해 주세요.`)
  }

  // 잔액 확인 및 차감 (balance 컬럼 필요)
  const { data: me } = await supabase
    .from('users')
    .select('balance')
    .eq('id', req.user.sub)
    .single()

  const currentBalance = Number((me as { balance?: number } | null)?.balance ?? 0)
  if (currentBalance < body.amount) {
    return errorResponse(400, 'INSUFFICIENT_BALANCE', `잔액이 부족합니다. (보유: ${currentBalance.toLocaleString()}원)`)
  }

  const nextBalance = currentBalance - body.amount
  const { data: updated, error: updateError } = await supabase
    .from('users')
    .update({ balance: nextBalance, updated_at: new Date().toISOString() })
    .eq('id', req.user.sub)
    .gte('balance', body.amount)
    .select('balance')
    .single()

  if (updateError || !updated) {
    return errorResponse(400, 'INSUFFICIENT_BALANCE', '잔액이 부족하거나 처리 중 오류가 발생했습니다.')
  }

  const { data: pledge, error } = await supabase
    .from('pledges')
    .insert({
      project_id: projectId,
      user_id: req.user.sub,
      reward_id: body.reward_id ?? null,
      amount: body.amount,
      status: 'completed',
    })
    .select('id, amount, status, created_at')
    .single()

  if (error || !pledge) {
    // 차감했으면 롤백 (잔액 복구)
    await supabase
      .from('users')
      .update({ balance: currentBalance, updated_at: new Date().toISOString() })
      .eq('id', req.user.sub)
    return errorResponse(500, 'INTERNAL_ERROR', '후원 처리에 실패했습니다.')
  }

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

  const parsed = await parseBody<FundingPutBody>(req, fundingPutSchema)
  if (parsed.error) return parsed.error
  const body = parsed.data

  const { data, error } = await supabase
    .from('fundings')
    .upsert({ project_id: projectId, ...body }, { onConflict: 'project_id' })
    .select()
    .single()

  if (error || !data) return errorResponse(500, 'INTERNAL_ERROR', '펀딩 설정 저장 실패')

  return successResponse(data)
})
