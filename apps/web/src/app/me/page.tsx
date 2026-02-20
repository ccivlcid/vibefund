'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { PageSpinner } from '@/components/ui/spinner'
import { formatCurrency, formatDate } from '@/lib/utils'

interface MyProject {
  id: string; title: string; status: string; approval_status: string
  thumbnail_url: string | null; created_at: string
  funding: { goal_amount: number; deadline: string }[]
}

interface MyPledge {
  id: string; amount: number; status: string; created_at: string
  project: { id: string; title: string }
  reward: { id?: string; name?: string } | null
}

interface MyComment {
  id: string; content: string; created_at: string
  project: { id: string; title: string }
}

type Tab = 'projects' | 'pledges' | 'comments' | 'profile'

const APPROVAL_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'muted' }> = {
  approved: { label: '승인됨', variant: 'success' },
  pending:  { label: '검토중', variant: 'warning' },
  rejected: { label: '반려됨', variant: 'danger' },
  hidden:   { label: '숨김',   variant: 'muted' },
}

const PLEDGE_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'muted' }> = {
  confirmed: { label: '확정',   variant: 'success' },
  pending:   { label: '처리중', variant: 'warning' },
  cancelled: { label: '취소',   variant: 'danger' },
  refunded:  { label: '환불',   variant: 'muted' },
}

const CHARGE_AMOUNTS = [10000, 50000, 100000, 500000]

export default function MyPage() {
  const { user, loading: authLoading, refresh: authRefresh } = useAuth()
  const router = useRouter()
  const [tab, setTab]       = useState<Tab>('projects')
  const [projects, setProjects]   = useState<MyProject[]>([])
  const [pledges, setPledges]     = useState<MyPledge[]>([])
  const [comments, setComments]   = useState<MyComment[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [name, setName]           = useState('')
  const [saving, setSaving]       = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const [chargeOpen, setChargeOpen] = useState(false)
  const [chargeAmount, setChargeAmount] = useState('')
  const [charging, setCharging] = useState(false)
  const [chargeError, setChargeError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth/login')
    if (user) setName(user.name)
  }, [user, authLoading, router])

  const fetchTab = useCallback(async (t: Tab) => {
    setDataLoading(true)
    try {
      if (t === 'projects') {
        const r = await api.post<{ data: MyProject[] }>('/users/me/projects', { limit: 50 })
        setProjects(r.data)
      } else if (t === 'pledges') {
        const r = await api.post<{ data: MyPledge[] }>('/users/me/pledges', { limit: 50 })
        setPledges(r.data)
      } else if (t === 'comments') {
        const r = await api.post<{ data: MyComment[] }>('/users/me/comments', { limit: 50 })
        setComments(r.data)
      }
    } finally {
      setDataLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user && tab !== 'profile') fetchTab(tab)
  }, [tab, user, fetchTab])

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setProfileMsg('')
    try {
      await api.patch('/users/me', { name: name.trim() })
      await authRefresh()
      setProfileMsg('저장되었습니다')
    } catch {
      setProfileMsg('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const handleCharge = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(chargeAmount.replace(/,/g, ''))
    if (!Number.isInteger(amount) || amount < 1000) {
      setChargeError('최소 1,000원 이상 입력해 주세요.')
      return
    }
    setCharging(true)
    setChargeError('')
    try {
      await api.post<{ data: { balance: number; charged: number } }>('/users/me/charge', { amount })
      await authRefresh()
      setChargeOpen(false)
      setChargeAmount('')
    } catch (err: unknown) {
      const e = err as { error?: { message?: string }; message?: string }
      setChargeError(e?.error?.message ?? e?.message ?? '충전에 실패했습니다.')
    } finally {
      setCharging(false)
    }
  }

  if (authLoading || !user) return <PageSpinner />

  const balance = Number(user.balance ?? 0)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'projects',  label: '내 프로젝트' },
    { key: 'pledges',   label: '후원 내역' },
    { key: 'comments',  label: '내 댓글' },
    { key: 'profile',   label: '계정 정보' },
  ]

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
          <p className="text-sm text-slate-500">{user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Card padding="md" className="bg-teal-50/80 border-teal-100">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500">테스트 잔액</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(balance)}</p>
                <p className="text-xs text-slate-400">프로토타입용 · 실제 결제 없음</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setChargeOpen(true); setChargeError(''); setChargeAmount('') }} className="shrink-0 border-teal-300 text-teal-700 hover:bg-teal-100">
                충전하기
              </Button>
            </div>
          </Card>
          <Link href="/projects/new">
            <Button variant="primary" size="sm">새 프로젝트</Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? 'border-teal-600 font-semibold text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {dataLoading ? (
        <PageSpinner />
      ) : tab === 'projects' ? (
        <div className="space-y-3">
          {projects.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-200">
              <p className="text-sm text-gray-400">등록한 프로젝트가 없습니다</p>
              <Link href="/projects/new"><Button variant="outline" size="sm">프로젝트 등록</Button></Link>
            </div>
          ) : projects.map((p) => {
            const ab = APPROVAL_BADGE[p.approval_status] ?? { label: p.approval_status, variant: 'muted' as const }
            return (
              <Card
                key={p.id}
                padding="md"
                className="transition-shadow hover:shadow-sm cursor-pointer"
                onClick={() => {
                  sessionStorage.setItem('vibefund_view_project_id', p.id)
                  router.push('/projects/view')
                }}
              >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{p.title}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{formatDate(p.created_at)}</p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <Badge variant={ab.variant}>{ab.label}</Badge>
                      <Badge variant={p.status === 'active' ? 'success' : 'muted'}>
                        {p.status === 'active' ? '진행중' : p.status === 'draft' ? '초안' : p.status}
                      </Badge>
                    </div>
                  </div>
                </Card>
            )
          })}
        </div>
      ) : tab === 'pledges' ? (
        <div className="space-y-3">
          {pledges.length === 0 ? (
            <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-gray-200">
              <p className="text-sm text-gray-400">후원 내역이 없습니다</p>
            </div>
          ) : pledges.map((pl) => {
            const pb = PLEDGE_BADGE[pl.status] ?? { label: pl.status, variant: 'muted' as const }
            return (
              <Card key={pl.id} padding="md">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <button
                      type="button"
                      className="truncate text-sm font-semibold text-gray-900 hover:underline text-left"
                      onClick={() => {
                        sessionStorage.setItem('vibefund_view_project_id', pl.project.id)
                        router.push('/projects/view')
                      }}
                    >
                      {pl.project.title}
                    </button>
                    {pl.reward && (pl.reward.name ?? (pl.reward as { title?: string }).title) && (
                      <p className="text-xs text-gray-400 mt-0.5">리워드: {pl.reward.name ?? (pl.reward as { title?: string }).title}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(pl.created_at)}</p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(pl.amount)}</span>
                    <Badge variant={pb.variant}>{pb.label}</Badge>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : tab === 'comments' ? (
        <div className="space-y-3">
          {comments.length === 0 ? (
            <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-gray-200">
              <p className="text-sm text-gray-400">작성한 댓글이 없습니다</p>
            </div>
          ) : comments.map((c) => (
            <Card key={c.id} padding="md">
              <button
                type="button"
                className="mb-1 text-xs font-medium text-gray-400 hover:text-gray-700 hover:underline text-left"
                onClick={() => {
                  sessionStorage.setItem('vibefund_view_project_id', c.project.id)
                  router.push('/projects/view')
                }}
              >
                {c.project.title}
              </button>
              <p className="text-sm text-gray-700">{c.content}</p>
              <p className="mt-1 text-xs text-gray-400">{formatDate(c.created_at)}</p>
            </Card>
          ))}
        </div>
      ) : (
        <div className="max-w-sm">
          <form onSubmit={handleProfileSave} className="space-y-4">
            <Input
              label="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input label="이메일" value={user.email} disabled />
            <Input label="역할" value={user.role === 'admin' ? '관리자' : '일반 사용자'} disabled />
            {profileMsg && (
              <p className={`text-xs ${profileMsg === '저장되었습니다' ? 'text-green-600' : 'text-red-500'}`}>
                {profileMsg}
              </p>
            )}
            <Button type="submit" loading={saving}>저장</Button>
          </form>
        </div>
      )}

      {/* 테스트 충전 모달 */}
      <Modal open={chargeOpen} onClose={() => { setChargeOpen(false); setChargeError('') }} title="테스트 충전" size="sm">
        <p className="mb-4 text-sm text-slate-600">
          프로토타입용 가상 충전입니다. 실제 결제 없이 잔액만 올라갑니다.
        </p>
        <form onSubmit={handleCharge} className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium text-slate-600">금액 선택</p>
            <div className="flex flex-wrap gap-2">
              {CHARGE_AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => { setChargeAmount(String(a)); setChargeError('') }}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    chargeAmount === String(a)
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {formatCurrency(a)}
                </button>
              ))}
            </div>
          </div>
          <Input
            label="직접 입력 (원)"
            type="text"
            inputMode="numeric"
            placeholder="예: 30000"
            value={chargeAmount}
            onChange={(e) => { setChargeAmount(e.target.value.replace(/\D/g, '')); setChargeError('') }}
            error={chargeError}
            hint="최소 1,000원 ~ 최대 10,000,000원"
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setChargeOpen(false)}>취소</Button>
            <Button type="submit" loading={charging} disabled={!chargeAmount || Number(chargeAmount) < 1000}>
              충전하기
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
