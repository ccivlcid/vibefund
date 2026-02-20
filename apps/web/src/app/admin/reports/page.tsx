'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageSpinner } from '@/components/ui/spinner'
import { formatDate, truncate } from '@/lib/utils'

interface ReportRow {
  id: string
  comment_id: string
  reason: string | null
  status: string
  created_at: string
  comment: { id: string; body: string; project_id: string; created_at: string } | null
  reporter: { name: string; email: string } | null
  project_title: string | null
}

export default function AdminReportsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [reports, setReports] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [actingId, setActingId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) router.replace('/')
  }, [user, authLoading, router])

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get<{ data: ReportRow[] }>(`/admin/reports?status=${statusFilter}`)
      setReports(r.data ?? [])
    } catch {
      setReports([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    if (user?.role === 'admin') fetchReports()
  }, [user, fetchReports])

  const handleResolve = async (reportId: string, action: 'resolve_dismiss' | 'resolve_delete') => {
    setActingId(reportId)
    try {
      await api.patch(`/admin/reports/${reportId}`, { action })
      await fetchReports()
    } finally {
      setActingId(null)
    }
  }

  if (authLoading || (user && user.role !== 'admin' && !loading)) return <PageSpinner />
  if (!user) return null

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">댓글 신고 관리</h1>
          <p className="mt-1 text-sm text-slate-500">신고 접수 건을 검토하고 유지 또는 댓글 삭제로 처리하세요.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin">
            <Button variant="outline" size="sm">대시보드</Button>
          </Link>
          <Link href="/admin/projects">
            <Button variant="ghost" size="sm">프로젝트</Button>
          </Link>
          <Link href="/admin/users">
            <Button variant="ghost" size="sm">회원</Button>
          </Link>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {['pending', 'resolved_dismissed', 'resolved_deleted'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-teal-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s === 'pending' ? '대기중' : s === 'resolved_dismissed' ? '유지' : '삭제 처리'}
          </button>
        ))}
      </div>

      {loading ? (
        <PageSpinner />
      ) : reports.length === 0 ? (
        <Card padding="md" className="text-center text-slate-500">
          {statusFilter === 'pending' ? '대기 중인 신고가 없습니다.' : '해당 상태의 신고가 없습니다.'}
        </Card>
      ) : (
        <ul className="space-y-4">
          {reports.map((r) => (
            <li key={r.id}>
              <Card padding="md" className="border-slate-200">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-400">
                      {formatDate(r.created_at)}
                      {r.reporter && ` · 신고자: ${r.reporter.name}`}
                      {r.project_title && ` · ${truncate(r.project_title, 30)}`}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-800">댓글 내용</p>
                    <p className="mt-0.5 rounded bg-slate-50 p-2 text-sm text-slate-700 whitespace-pre-wrap">
                      {r.comment?.body ?? '(삭제됨)'}
                    </p>
                    {r.reason && (
                      <p className="mt-2 text-xs text-amber-700">
                        <span className="font-medium">신고 사유:</span> {r.reason}
                      </p>
                    )}
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        loading={actingId === r.id}
                        disabled={!!actingId}
                        onClick={() => handleResolve(r.id, 'resolve_dismiss')}
                      >
                        유지
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        loading={actingId === r.id}
                        disabled={!!actingId}
                        onClick={() => confirm('이 댓글을 삭제할까요?') && handleResolve(r.id, 'resolve_delete')}
                      >
                        댓글 삭제
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
