import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, successResponse, errorResponse } from '@/lib/auth'
import { parseBody } from '@/lib/validate'

const QUESTION_KEYS = ['q1_use_intent', 'q2_monthly_pay', 'q3_improvement'] as const

const postSchema = z.object({
  q1_use_intent: z.string().min(1, '사용 의향을 선택해 주세요.').optional(),
  q2_monthly_pay: z.string().min(1, '월 지불 가능 금액을 입력해 주세요.').optional(),
  q3_improvement: z.string().min(1, '개선이 필요한 부분을 입력해 주세요.').optional(),
})

// GET /api/v1/projects/:id/verification-responses — 내 응답 또는 집계 (비인증 시 집계만)
export async function GET(req: NextRequest, { params }: { params: Promise<Record<string, string>> }) {
  const { id: projectId } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single()

  if (!project) return errorResponse(404, 'NOT_FOUND', '프로젝트를 찾을 수 없습니다.')

  const { data: rows } = await supabase
    .from('verification_responses')
    .select('question_key, answer')
    .eq('project_id', projectId)

  const byQuestion: Record<string, string[]> = { q1_use_intent: [], q2_monthly_pay: [], q3_improvement: [] }
  for (const r of rows ?? []) {
    if (QUESTION_KEYS.includes(r.question_key as (typeof QUESTION_KEYS)[number])) {
      byQuestion[r.question_key].push(r.answer)
    }
  }

  return successResponse({
    counts: {
      q1_use_intent: byQuestion.q1_use_intent.length,
      q2_monthly_pay: byQuestion.q2_monthly_pay.length,
      q3_improvement: byQuestion.q3_improvement.length,
    },
    samples: {
      q1_use_intent: byQuestion.q1_use_intent.slice(0, 20),
      q2_monthly_pay: byQuestion.q2_monthly_pay.slice(0, 20),
      q3_improvement: byQuestion.q3_improvement.slice(0, 30),
    },
  })
}

// POST /api/v1/projects/:id/verification-responses — 검증 질문 응답 제출 (로그인 필요)
export const POST = withAuth(async (req: AuthedRequest, { params }) => {
  const { id: projectId } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single()

  if (!project) return errorResponse(404, 'NOT_FOUND', '프로젝트를 찾을 수 없습니다.')

  const parsed = await parseBody(req, postSchema)
  if (parsed.error) return parsed.error

  const body = parsed.data
  const toUpsert: { project_id: string; user_id: string; question_key: string; answer: string }[] = []

  if (body.q1_use_intent) toUpsert.push({ project_id: projectId, user_id: req.user.sub, question_key: 'q1_use_intent', answer: body.q1_use_intent })
  if (body.q2_monthly_pay) toUpsert.push({ project_id: projectId, user_id: req.user.sub, question_key: 'q2_monthly_pay', answer: body.q2_monthly_pay })
  if (body.q3_improvement) toUpsert.push({ project_id: projectId, user_id: req.user.sub, question_key: 'q3_improvement', answer: body.q3_improvement })

  if (toUpsert.length === 0) {
    return errorResponse(400, 'VALIDATION_ERROR', '최소 한 문항에 응답해 주세요.')
  }

  for (const row of toUpsert) {
    const { error } = await supabase
      .from('verification_responses')
      .upsert(row, { onConflict: 'project_id,user_id,question_key' })
    if (error) return errorResponse(500, 'INTERNAL_ERROR', '응답 저장에 실패했습니다.')
  }

  return successResponse({ ok: true }, 201)
})
