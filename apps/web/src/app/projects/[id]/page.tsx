'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card } from '@/components/ui/card'
import { PageSpinner } from '@/components/ui/spinner'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'

import { formatCurrency, formatDate, daysLeft, progressPercent } from '@/lib/utils'

interface Reward { id: string; title: string; description: string; amount: number; reward_type: string; delivery_date: string | null }
interface Comment { id: string; content: string; created_at: string; user: { name: string } }
interface Update { id: string; title: string; content: string; created_at: string }
interface Funding { goal_amount: number; current_amount: number; deadline: string; backer_count: number; progress_percent: number }
interface Project {
  id: string; title: string; description: string; status: string; approval_status: string
  thumbnail_url: string | null; created_at: string; user_id: string
  user: { name: string }
  funding: Funding | null
  rewards: Reward[]
  comments: Comment[]
  updates: Update[]
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const { user } = useAuth()

  const [project, setProject]         = useState<Project | null>(null)
  const [loading, setLoading]         = useState(true)
  const [tab, setTab]                 = useState<'info' | 'updates' | 'comments'>('info')
  const [pledgeOpen, setPledgeOpen]   = useState(false)
  const [selectedReward, setReward]   = useState<Reward | null>(null)
  const [pledgeAmt, setPledgeAmt]     = useState('')
  const [pledging, setPledging]       = useState(false)
  const [pledgeError, setPledgeError] = useState('')
  const [commentText, setComment]     = useState('')
  const [commenting, setCommenting]   = useState(false)

  useEffect(() => {
    api.get<{ data: Project }>(`/projects/${id}`)
      .then((r) => setProject(r.data))
      .catch(() => router.replace('/'))
      .finally(() => setLoading(false))
  }, [id, router])

  const handlePledge = async () => {
    if (!user) { router.push('/auth/login'); return }
    const amount = Number(pledgeAmt)
    if (!amount || amount < 1) { setPledgeError('금액을 입력해 주세요'); return }
    setPledging(true)
    try {
      await api.post(`/projects/${id}/funding`, {
        reward_id: selectedReward?.id ?? null,
        amount,
      })
      setPledgeOpen(false)
      const r = await api.get<{ data: Project }>(`/projects/${id}`)
      setProject(r.data)
    } catch (e: unknown) {
      const err = e as { message?: string }
      setPledgeError(err?.message ?? '펀딩 실패')
    } finally {
      setPledging(false)
    }
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) { router.push('/auth/login'); return }
    if (!commentText.trim()) return
    setCommenting(true)
    try {
      await api.post(`/projects/${id}/comments`, { content: commentText })
      setComment('')
      const r = await api.get<{ data: Project }>(`/projects/${id}`)
      setProject(r.data)
    } finally {
      setCommenting(false)
    }
  }

  if (loading) return <PageSpinner />
  if (!project) return null

  const f = project.funding
  const pct = f ? (f.progress_percent ?? progressPercent(f.current_amount, f.goal_amount)) : 0
  const days = f ? daysLeft(f.deadline) : null
  const isOwner = user?.id === project.user_id
  const canFund = project.status === 'active' && project.approval_status === 'approved'

  const tabs = [
    { key: 'info',     label: '프로젝트 소개' },
    { key: 'updates',  label: `업데이트 ${project.updates.length}` },
    { key: 'comments', label: `댓글 ${project.comments.length}` },
  ] as const

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Left: main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Thumbnail */}
          <div className="relative h-72 w-full overflow-hidden rounded-lg bg-gray-100">
            {project.thumbnail_url ? (
              <Image src={project.thumbnail_url} alt={project.title} fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-300">이미지 없음</div>
            )}
          </div>

          {/* Title & meta */}
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant={project.status === 'active' ? 'success' : 'muted'}>
                {project.status === 'active' ? '진행중' : project.status}
              </Badge>
              {project.approval_status !== 'approved' && (
                <Badge variant="warning">{project.approval_status}</Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
            <div className="mt-2 flex items-center gap-3 text-sm text-gray-400">
              <span>by <span className="font-medium text-gray-600">{project.user?.name}</span></span>
              <span>&middot;</span>
              <span>{formatDate(project.created_at)}</span>
              {isOwner && (
                <Link href={`/projects/${id}/edit`} className="ml-auto text-xs text-gray-500 hover:text-gray-900 underline">
                  수정
                </Link>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex gap-0">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
                    tab === t.key
                      ? 'border-gray-900 font-semibold text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          {tab === 'info' && (
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
              {project.description || <span className="text-gray-400">소개가 없습니다.</span>}
            </div>
          )}

          {tab === 'updates' && (
            <div className="space-y-4">
              {project.updates.length === 0 ? (
                <p className="text-sm text-gray-400">업데이트가 없습니다.</p>
              ) : project.updates.map((u) => (
                <Card key={u.id} padding="md">
                  <p className="text-xs text-gray-400 mb-1">{formatDate(u.created_at)}</p>
                  <h4 className="font-semibold text-gray-900 mb-1">{u.title}</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{u.content}</p>
                </Card>
              ))}
            </div>
          )}

          {tab === 'comments' && (
            <div className="space-y-4">
              <form onSubmit={handleComment} className="flex gap-2">
                <Input
                  placeholder={user ? '댓글을 입력하세요' : '로그인 후 댓글을 작성할 수 있습니다'}
                  value={commentText}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={!user}
                  className="flex-1"
                />
                <Button type="submit" size="md" disabled={!user || commenting || !commentText.trim()}>
                  등록
                </Button>
              </form>
              {project.comments.length === 0 ? (
                <p className="text-sm text-gray-400">댓글이 없습니다.</p>
              ) : project.comments.map((c) => (
                <div key={c.id} className="flex gap-3 border-b border-gray-100 pb-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                    {c.user?.name?.[0] ?? 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{c.user?.name}</span>
                      <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-600">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: funding sidebar */}
        <div className="space-y-4">
          <Card padding="md" className="sticky top-20">
            {f ? (
              <div className="space-y-4">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{formatCurrency(f.current_amount)}</div>
                  <div className="text-sm text-gray-400">목표 {formatCurrency(f.goal_amount)}</div>
                </div>
                <Progress value={pct} showLabel />
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded bg-gray-50 p-3">
                    <div className="text-lg font-bold text-gray-900">{f.backer_count ?? 0}</div>
                    <div className="text-xs text-gray-400">후원자</div>
                  </div>
                  <div className="rounded bg-gray-50 p-3">
                    <div className="text-lg font-bold text-gray-900">{days !== null ? (days > 0 ? days : 0) : '-'}</div>
                    <div className="text-xs text-gray-400">남은 일수</div>
                  </div>
                </div>
                {canFund && (
                  <Button fullWidth onClick={() => { setReward(null); setPledgeAmt(''); setPledgeError(''); setPledgeOpen(true) }}>
                    펀딩하기
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">펀딩 정보가 없습니다.</p>
            )}
          </Card>

          {/* Rewards */}
          {project.rewards.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">리워드</h3>
              {project.rewards.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  disabled={!canFund}
                  onClick={() => { setReward(r); setPledgeAmt(String(r.amount)); setPledgeError(''); setPledgeOpen(true) }}
                  className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left transition-colors hover:border-gray-400 disabled:cursor-default disabled:opacity-60"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">{r.title}</span>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(r.amount)}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 line-clamp-2">{r.description}</p>
                  {r.delivery_date && (
                    <p className="mt-1 text-xs text-gray-400">배송 예정: {formatDate(r.delivery_date)}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pledge modal */}
      <Modal open={pledgeOpen} onClose={() => setPledgeOpen(false)} title="펀딩하기" size="sm">
        <div className="space-y-4">
          {selectedReward && (
            <div className="rounded bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-700">{selectedReward.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{selectedReward.description}</p>
            </div>
          )}
          <Input
            label="펀딩 금액 (원)"
            type="number"
            min={1}
            value={pledgeAmt}
            onChange={(e) => { setPledgeAmt(e.target.value); setPledgeError('') }}
            error={pledgeError}
            placeholder="10000"
          />
          <Button fullWidth loading={pledging} onClick={handlePledge}>
            확인
          </Button>
        </div>
      </Modal>
    </div>
  )
}
