'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import { PageSpinner } from '@/components/ui/spinner'
import { formatDate, truncate } from '@/lib/utils'

interface AdminProject {
  id: string; title: string; status: string; approval_status: string
  rejection_reason: string | null; created_at: string
  user: { name: string; email: string }
}

type ApprovalStatus = 'approved' | 'rejected' | 'hidden'

const APPROVAL_FILTER = [
  { value: '',         label: '전체' },
  { value: 'pending',  label: '대기중' },
  { value: 'approved', label: '승인됨' },
  { value: 'rejected', label: '반려됨' },
  { value: 'hidden',   label: '숨김' },
]

const APPROVAL_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'muted' }> = {
  approved: { label: '승인됨', variant: 'success' },
  pending:  { label: '대기중', variant: 'warning' },
  rejected: { label: '반려됨', variant: 'danger' },
  hidden:   { label: '숨김',   variant: 'muted' },
}

export default function AdminProjectsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [projects, setProjects]   = useState<AdminProject[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('pending')
  const [selected, setSelected]   = useState<AdminProject | null>(null)
  const [action, setAction]       = useState<ApprovalStatus | null>(null)
  const [reason, setReason]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AdminProject | null>(null)
  const [deleting, setDeleting]   = useState(false)

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) router.replace('/')
  }, [user, authLoading, router])

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.post<{ data: AdminProject[] }>('/admin/projects', {
        limit: 100,
        ...(filter && { approval_status: filter }),
      })
      setProjects(r.data)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    if (user?.role === 'admin') fetchProjects()
  }, [user, fetchProjects])

  const openModal = (p: AdminProject, a: ApprovalStatus) => {
    setSelected(p); setAction(a); setReason(''); setError('')
  }

  const handleApprove = async () => {
    if (!selected || !action) return
    if (action === 'rejected' && !reason.trim()) { setError('반려 사유를 입력해 주세요'); return }
    setSubmitting(true)
    try {
      await api.patch(`/admin/projects/${selected.id}/approval`, {
        approval_status: action,
        ...(action === 'rejected' && { rejection_reason: reason.trim() }),
      })
      setSelected(null)
      await fetchProjects()
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(err?.message ?? '처리 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/admin/projects/${deleteTarget.id}`)
      setDeleteTarget(null)
      await fetchProjects()
    } catch (e: unknown) {
      const err = e as { error?: { message?: string }; message?: string }
      setError(err?.error?.message ?? err?.message ?? '삭제 실패')
    } finally {
      setDeleting(false)
    }
  }

  if (authLoading) return <PageSpinner />

  const actionLabels: Record<ApprovalStatus, string> = {
    approved: '승인',
    rejected: '반려',
    hidden:   '숨김 처리',
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-xs text-gray-400 hover:text-gray-700">대시보드</Link>
          <span className="mx-1 text-gray-300">/</span>
          <h1 className="inline text-xl font-bold text-gray-900">프로젝트 관리</h1>
        </div>
        <Select
          options={APPROVAL_FILTER}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-36"
        />
      </div>

      {loading ? (
        <PageSpinner />
      ) : projects.length === 0 ? (
        <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-gray-200">
          <p className="text-sm text-gray-400">해당하는 프로젝트가 없습니다</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left font-medium text-gray-600">프로젝트</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">등록자</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">상태</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">등록일</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {projects.map((p) => {
                const ab = APPROVAL_BADGE[p.approval_status] ?? { label: p.approval_status, variant: 'muted' as const }
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="font-medium text-gray-900 hover:underline text-left"
                        onClick={() => {
                          sessionStorage.setItem('vibefund_view_project_id', p.id)
                          router.push('/projects/view')
                        }}
                      >
                        {truncate(p.title, 40)}
                      </button>
                      {p.rejection_reason && (
                        <p className="mt-0.5 text-xs text-red-500 line-clamp-1">반려: {p.rejection_reason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      <div>{p.user?.name}</div>
                      <div className="text-xs text-gray-400">{p.user?.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ab.variant}>{ab.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1 flex-wrap">
                        {p.approval_status !== 'approved' && (
                          <Button size="sm" variant="secondary" onClick={() => openModal(p, 'approved')}>
                            승인
                          </Button>
                        )}
                        {p.approval_status !== 'rejected' && (
                          <Button size="sm" variant="danger" onClick={() => openModal(p, 'rejected')}>
                            반려
                          </Button>
                        )}
                        {p.approval_status !== 'hidden' && (
                          <Button size="sm" variant="outline" onClick={() => openModal(p, 'hidden')}>
                            숨김
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => { setDeleteTarget(p); setError('') }}
                        >
                          삭제
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`프로젝트 ${action ? actionLabels[action] : ''}`}
        size="sm"
      >
        {selected && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">{selected.title}</span> 프로젝트를{' '}
              {action ? actionLabels[action] : ''} 처리하시겠습니까?
            </p>
            {action === 'rejected' && (
              <Textarea
                label="반려 사유"
                value={reason}
                onChange={(e) => { setReason(e.target.value); setError('') }}
                placeholder="반려 사유를 입력해 주세요"
                error={error}
                rows={3}
              />
            )}
            {error && action !== 'rejected' && (
              <p className="text-xs text-red-500">{error}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>취소</Button>
              <Button
                variant={action === 'rejected' ? 'danger' : 'primary'}
                loading={submitting}
                onClick={handleApprove}
              >
                {action ? actionLabels[action] : '확인'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="프로젝트 삭제 (DB에서 제거)"
        size="sm"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">{deleteTarget.title}</span> 프로젝트를 DB에서
              완전히 삭제합니다. 연관된 펀딩·리워드·댓글·검증 응답 등도 함께 삭제되며 복구할 수 없습니다.
            </p>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>취소</Button>
              <Button variant="danger" loading={deleting} onClick={handleDelete}>
                삭제
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
