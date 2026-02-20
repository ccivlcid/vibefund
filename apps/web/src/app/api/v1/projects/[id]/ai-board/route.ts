import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, successResponse, errorResponse } from '@/lib/auth'

type Params = { params: Promise<Record<string, string>> }

// GET /api/v1/projects/:id/ai-board — 최신 심사 결과 + 멤버별 점수
export async function GET(_req: NextRequest, { params }: Params) {
  const { id: projectId } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single()

  if (!project) return errorResponse(404, 'PROJECT_NOT_FOUND', '프로젝트를 찾을 수 없습니다.')

  const { data: report, error: reportError } = await supabase
    .from('ai_board_reports')
    .select('id, overall_score, grade, strengths, risks, improvements, calculated_at')
    .eq('project_id', projectId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (reportError) return errorResponse(500, 'INTERNAL_ERROR', 'AI 이사회 결과 조회 실패')

  if (!report) {
    return successResponse({ report: null, scores: [] })
  }

  const { data: scores, error: scoresError } = await supabase
    .from('ai_board_report_scores')
    .select(`
      score, feedback, details,
      ai_board_members (id, key, display_name)
    `)
    .eq('ai_board_report_id', report.id)
    .order('created_at', { ascending: true })

  if (scoresError) return errorResponse(500, 'INTERNAL_ERROR', '멤버별 점수 조회 실패')

  return successResponse({
    report: {
      id: report.id,
      overall_score: report.overall_score,
      grade: report.grade,
      strengths: report.strengths ?? [],
      risks: report.risks ?? [],
      improvements: report.improvements ?? [],
      calculated_at: report.calculated_at,
    },
    scores: scores ?? [],
  })
}

// POST /api/v1/projects/:id/ai-board/run — 심사 실행 (본인 프로젝트만, 목업)
export const POST = withAuth(async (req: AuthedRequest, { params }: Params) => {
  const { id: projectId } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('id, user_id, title, short_description, description')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single()

  if (!project) return errorResponse(404, 'PROJECT_NOT_FOUND', '프로젝트를 찾을 수 없습니다.')
  if (project.user_id !== req.user.sub && req.user.role !== 'admin') {
    return errorResponse(403, 'FORBIDDEN', '심사 실행 권한이 없습니다.')
  }

  const { data: selections } = await supabase
    .from('project_ai_board_selections')
    .select('ai_board_member_id, ai_board_members(id, key, default_weight_percent)')
    .eq('project_id', projectId)

  type MemberRef = { id: string; key: string; default_weight_percent: number }
  type SelectionRow = { ai_board_member_id: string; ai_board_members: MemberRef | MemberRef[] | null }
  const members = (selections ?? []) as unknown as SelectionRow[]
  if (members.length === 0) {
    return errorResponse(400, 'NO_MEMBERS', 'AI 이사회 위원을 먼저 선택해 주세요. 프로젝트 수정에서 위원을 추가할 수 있어요.')
  }

  const getMember = (m: SelectionRow): MemberRef | null => {
    const ref = m.ai_board_members
    if (!ref) return null
    return Array.isArray(ref) ? ref[0] ?? null : ref
  }

  // 목업: 선택된 멤버 수에 맞춰 5~9 사이 랜덤 점수 + 가중 평균
  const seed = projectId.slice(0, 8) + Date.now().toString(36)
  const hash = (s: string) => {
    let h = 0
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
    return Math.abs(h)
  }

  const weights = members.map((m) => {
    const mem = getMember(m)
    const w = mem?.default_weight_percent ?? 0
    return w > 0 ? w / 100 : 1 / members.length
  })
  const sumW = weights.reduce((a, b) => a + b, 0)
  const normWeights = weights.map((w) => w / sumW)

  const reportScores: { member_id: string; score: number; feedback: string }[] = []
  let weightedSum = 0
  const feedbackTemplates: Record<string, string[]> = {
    buffett: ['수익 모델이 명확해 보입니다.', '초기 CAC 가정을 한번 더 검토해 보세요.', '이해하기 쉬운 비즈니스입니다.'],
    jobs: ['비전이 잘 드러납니다.', '스토리텔링을 보강하면 좋겠어요.', '차별화 포인트가 인상적입니다.'],
    karpathy: ['기술 구현 방향이 현실적입니다.', 'MVP 범위를 좁히는 것을 권합니다.', 'AI 활용 구조가 적절해 보입니다.'],
    gates: ['사회적 임팩트 관점이 돋보입니다.', '스케일 전략을 구체화해 보세요.', '접근성이 좋습니다.'],
    musk: ['실행 가능성이 있어 보입니다.', '규모의 경제를 고려한 전략이 좋아요.', '비전이 크네요.'],
    lynch: ['소비자 관점이 잘 보입니다.', '성장 스토리가 명확해요.', '이해하기 쉬운 가치 제안입니다.'],
    thiel: ['차별화 포인트가 있습니다.', '0→1 관점에서 비밀(secret)을 더 구체화해 보세요.', '독점 가능성이 보입니다.'],
  }

  for (let i = 0; i < members.length; i++) {
    const m = members[i]
    const key = getMember(m)?.key ?? 'buffett'
    const r = (hash(seed + key + i) % 50) / 10 + 5
    const score = Math.round(r * 10) / 10
    const templates = feedbackTemplates[key] ?? feedbackTemplates.buffett
    const feedback = templates[hash(seed + key + i + 1) % templates.length]
    reportScores.push({ member_id: m.ai_board_member_id, score, feedback })
    weightedSum += score * normWeights[i]
  }

  const overallScore = Math.round(weightedSum * 10) / 10
  let grade: 'A' | 'B' | 'C' | 'D' = 'C'
  if (overallScore >= 8) grade = 'A'
  else if (overallScore >= 6.5) grade = 'B'
  else if (overallScore >= 5) grade = 'C'
  else grade = 'D'

  const strengths = [
    '명확한 문제 정의',
    '타겟이 잘 정해져 있음',
    '차별화 포인트가 보임',
  ].slice(0, 2 + (hash(seed + 's') % 2))
  const risks = [
    '초기 단계 리스크',
    '시장 검증 보강 권장',
    '수익화 시점 검토',
  ].slice(0, 2 + (hash(seed + 'r') % 2))
  const improvements = [
    '한 줄 소개를 더 구체화해 보세요',
    '수익 모델을 짧게 보강하면 좋아요',
    '타겟 고객을 한 문장으로 명시해 보세요',
  ].slice(0, 2 + (hash(seed + 'i') % 2))

  const { data: reportRow, error: reportError } = await supabase
    .from('ai_board_reports')
    .insert({
      project_id: projectId,
      overall_score: overallScore,
      grade,
      strengths,
      risks,
      improvements,
    })
    .select('id')
    .single()

  if (reportError || !reportRow) return errorResponse(500, 'INTERNAL_ERROR', 'AI 이사회 결과 저장 실패')

  for (const s of reportScores) {
    await supabase.from('ai_board_report_scores').insert({
      ai_board_report_id: reportRow.id,
      ai_board_member_id: s.member_id,
      score: s.score,
      feedback: s.feedback,
    })
  }

  const { data: final } = await supabase
    .from('ai_board_reports')
    .select('id, overall_score, grade, strengths, risks, improvements, calculated_at')
    .eq('id', reportRow.id)
    .single()

  return successResponse({ report: final, message: 'AI 이사회 심사가 완료되었어요!' }, 201)
})
