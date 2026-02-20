'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { getMemberInitial } from './member-icons'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ReportSummary {
  id: string
  overall_score: number
  grade: 'A' | 'B' | 'C' | 'D'
  strengths: string[]
  risks: string[]
  improvements: string[]
  calculated_at: string
}

interface MemberScore {
  score: number
  feedback: string | null
  details: unknown
  ai_board_members: { id: string; key: string; display_name: string } | null
}

interface AiBoardData {
  report: ReportSummary | null
  scores: MemberScore[]
}

const GRADE_STYLE: Record<string, { label: string; className: string }> = {
  A: { label: '투자자 공개 가능', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  B: { label: '보완 후 공개 권장', className: 'bg-teal-100 text-teal-800 border-teal-300' },
  C: { label: '커뮤니티 검증 필요', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  D: { label: '재구성 권장', className: 'bg-rose-100 text-rose-800 border-rose-300' },
}

interface AiBoardReportViewProps {
  projectId: string
  isOwner: boolean
  onRunComplete?: () => void
}

export function AiBoardReportView({ projectId, isOwner, onRunComplete }: AiBoardReportViewProps) {
  const [data, setData] = useState<AiBoardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  const fetchReport = () => {
    setLoading(true)
    setError('')
    fetch(`/api/v1/projects/${projectId}/ai-board`, { credentials: 'include' })
      .then((res) => res.json())
      .then((json) => {
        if (json?.error) {
          setError(json.error?.message ?? '조회 실패')
          setData({ report: null, scores: [] })
        } else {
          setData(json.data ?? { report: null, scores: [] })
        }
      })
      .catch(() => {
        setError('AI 이사회 결과를 불러오지 못했어요')
        setData({ report: null, scores: [] })
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchReport()
  }, [projectId])

  const runAnalysis = () => {
    if (!isOwner || running) return
    setRunning(true)
    setError('')
    fetch(`/api/v1/projects/${projectId}/ai-board`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((json) => {
        if (json?.error) {
          setError(json.error?.message ?? '심사 실행 실패')
        } else {
          fetchReport()
          onRunComplete?.()
        }
      })
      .catch(() => setError('심사 실행에 실패했어요. 잠시 후 다시 시도해 주세요.'))
      .finally(() => setRunning(false))
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/50 py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
        <p className="mt-3 text-sm text-slate-500">AI 이사회 결과를 불러오는 중…</p>
      </div>
    )
  }

  const report = data?.report ?? null
  const scores = data?.scores ?? []

  if (!report) {
    return (
      <div className="space-y-6">
        <Card className="overflow-hidden border-2 border-dashed border-amber-200 bg-amber-50/60 p-8" padding="none">
          <div className="p-6 sm:p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-amber-200 bg-amber-50 text-xl font-bold text-amber-700">
              AI
            </div>
            <h3 className="mt-4 text-center text-lg font-semibold text-slate-900">AI 이사회 심사를 받아 보세요</h3>
            <p className="mt-2 text-center text-sm text-slate-600">
              선택한 위원들이 투자 관점에서 프로젝트를 평가해 드려요. 강점·리스크·개선점을 한눈에 확인할 수 있어요.
            </p>
            {error && (
              <p className="mt-3 text-center text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            {isOwner && (
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={runAnalysis}
                  loading={running}
                  className="rounded-xl bg-amber-500 px-6 hover:bg-amber-600"
                >
                  {running ? '심사 중…' : '지금 심사 받기'}
                </Button>
              </div>
            )}
            {!isOwner && (
              <p className="mt-4 text-center text-xs text-slate-500">제작자만 심사를 실행할 수 있어요.</p>
            )}
          </div>
        </Card>
      </div>
    )
  }

  const gradeStyle = GRADE_STYLE[report.grade] ?? GRADE_STYLE.C

  return (
    <div className="space-y-8">
      {/* 요약 대시보드 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-2xl border-2 text-xl font-bold',
                gradeStyle.className
              )}
            >
              {report.grade}
            </span>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                종합 <span className="text-teal-600">{report.overall_score}</span>점
              </p>
              <p className="text-sm font-medium text-slate-500">{gradeStyle.label}</p>
            </div>
          </div>
          <Badge variant="muted" className="text-xs">
            {new Date(report.calculated_at).toLocaleDateString('ko-KR')} 심사
          </Badge>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {report.strengths?.length > 0 && (
            <div className="rounded-xl bg-emerald-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">강점</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-emerald-800">
                {report.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {report.risks?.length > 0 && (
            <div className="rounded-xl bg-amber-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">리스크</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-800">
                {report.risks.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {report.improvements?.length > 0 && (
            <div className="rounded-xl bg-sky-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">개선 제안</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-sky-800">
                {report.improvements.map((imp, i) => (
                  <li key={i}>{imp}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 위원별 카드 */}
      <div>
        <h3 className="mb-4 text-sm font-semibold text-slate-700">위원별 의견</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {scores.map((s, i) => {
            const member = s.ai_board_members
            const key = member?.key ?? ''
            const name = member?.display_name ?? '위원'
            return (
              <Card
                key={member?.id ?? i}
                className="overflow-hidden border-slate-200 transition-shadow hover:shadow-md"
                padding="md"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-700">
                    {getMemberInitial(key)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{name}</span>
                      <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-sm font-bold text-teal-800">
                        {Number(s.score).toFixed(1)}
                      </span>
                    </div>
                    {s.feedback && (
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">&ldquo;{s.feedback}&rdquo;</p>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {isOwner && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={runAnalysis} loading={running} className="rounded-xl">
            다시 심사 받기
          </Button>
        </div>
      )}
    </div>
  )
}
