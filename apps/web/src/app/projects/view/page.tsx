'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card } from '@/components/ui/card'
import { PageSpinner } from '@/components/ui/spinner'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'

import { formatCurrency, formatDate, daysLeft, progressPercent } from '@/lib/utils'

const REWARD_TYPE_OPTIONS = [
  { value: 'beta', label: '얼리버드 / 베타' },
  { value: 'lifetime', label: '평생 이용권' },
  { value: 'subscription_discount', label: '구독 할인' },
]

const VIEW_PROJECT_ID_KEY = 'vibefund_view_project_id'

interface Reward { id: string; name?: string; title?: string; description: string; amount: number; type: string }
interface Comment { id: string; content: string; created_at: string; user: { name: string } }
interface Update { id: string; title: string; content: string; created_at: string }
interface Funding { goal_amount: number; current_amount: number; deadline: string; backer_count: number; progress_percent: number }
interface Project {
  id: string; title: string; short_description?: string; description: string; status: string; approval_status: string
  thumbnail_url: string | null; service_url: string | null; created_at: string; user_id: string
  user: { name: string }
  funding: Funding | null
  rewards: Reward[]
  comments: Comment[]
  updates: Update[]
}

export default function ProjectViewPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [projectId, setProjectId] = useState<string | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'info' | 'updates' | 'comments'>('info')
  const [pledgeOpen, setPledgeOpen] = useState(false)
  const [selectedReward, setReward] = useState<Reward | null>(null)
  const [pledgeAmt, setPledgeAmt] = useState('')
  const [pledging, setPledging] = useState(false)
  const [pledgeError, setPledgeError] = useState('')
  const [commentText, setComment] = useState('')
  const [commenting, setCommenting] = useState(false)
  const [rewardModalOpen, setRewardModalOpen] = useState(false)
  const [editingReward, setEditingReward] = useState<Reward | null>(null)
  const [rewardName, setRewardName] = useState('')
  const [rewardDesc, setRewardDesc] = useState('')
  const [rewardAmount, setRewardAmount] = useState('')
  const [rewardType, setRewardType] = useState<'beta' | 'lifetime' | 'subscription_discount'>('beta')
  const [rewardSaving, setRewardSaving] = useState(false)
  const [rewardError, setRewardError] = useState('')

  useEffect(() => {
    const id = typeof window !== 'undefined' ? sessionStorage.getItem(VIEW_PROJECT_ID_KEY) : null
    if (!id) {
      router.replace('/')
      return
    }
    setProjectId(id)
    api.post<{ data: Project }>('/projects/detail', { id })
      .then((r) => setProject(r.data))
      .catch(() => router.replace('/'))
      .finally(() => setLoading(false))
  }, [router])

  const refreshProject = () => {
    if (!projectId) return
    api.post<{ data: Project }>('/projects/detail', { id: projectId })
      .then((r) => setProject(r.data))
      .catch(() => {})
  }

  const handlePledge = async () => {
    if (!user) { router.push('/auth/login'); return }
    if (!projectId) return
    const amount = Number(pledgeAmt)
    if (!amount || amount < 1) { setPledgeError('금액을 입력해 주세요'); return }
    setPledging(true)
    try {
      await api.post(`/projects/${projectId}/funding`, {
        reward_id: selectedReward?.id ?? null,
        amount,
      })
      setPledgeOpen(false)
      refreshProject()
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
    if (!projectId || !commentText.trim()) return
    setCommenting(true)
    try {
      await api.post(`/projects/${projectId}/comments`, { content: commentText })
      setComment('')
      refreshProject()
    } finally {
      setCommenting(false)
    }
  }

  const openRewardModal = (reward?: Reward) => {
    if (reward) {
      setEditingReward(reward)
      setRewardName(reward.name ?? (reward as { title?: string }).title ?? '')
      setRewardDesc(reward.description ?? '')
      setRewardAmount(String(reward.amount))
      setRewardType((reward.type as 'beta' | 'lifetime' | 'subscription_discount') || 'beta')
    } else {
      setEditingReward(null)
      setRewardName('')
      setRewardDesc('')
      setRewardAmount('')
      setRewardType('beta')
    }
    setRewardError('')
    setRewardModalOpen(true)
  }

  const handleSaveReward = async () => {
    if (!projectId) return
    const name = rewardName.trim()
    const description = rewardDesc.trim()
    const amount = Number(rewardAmount)
    if (!name) { setRewardError('리워드 이름을 입력해 주세요'); return }
    if (!description) { setRewardError('설명을 입력해 주세요'); return }
    if (!Number.isFinite(amount) || amount < 0) { setRewardError('금액을 입력해 주세요 (0 이상)'); return }
    setRewardSaving(true)
    setRewardError('')
    try {
      if (editingReward) {
        await api.patch(`/projects/${projectId}/rewards/${editingReward.id}`, { name, description, amount, type: rewardType })
      } else {
        await api.post(`/projects/${projectId}/rewards`, { name, description, amount, type: rewardType })
      }
      setRewardModalOpen(false)
      refreshProject()
    } catch (e: unknown) {
      const err = e as { message?: string }
      setRewardError(err?.message ?? '저장 실패')
    } finally {
      setRewardSaving(false)
    }
  }

  const handleDeleteReward = async (rewardId: string) => {
    if (!projectId || !confirm('이 리워드를 삭제할까요?')) return
    try {
      await api.delete(`/projects/${projectId}/rewards/${rewardId}`)
      refreshProject()
    } catch {
      // ignore
    }
  }

  if (loading || !projectId) return <PageSpinner />
  if (!project) return null

  const updates = project.updates ?? []
  const comments = project.comments ?? []
  const rewards = project.rewards ?? []
  const f = project.funding
  const pct = f ? (f.progress_percent ?? progressPercent(f.current_amount, f.goal_amount)) : 0
  const days = f ? daysLeft(f.deadline) : null
  const isOwner = user?.id === project.user_id
  const canFund = project.status === 'active' && project.approval_status === 'approved'

  const tabs = [
    { key: 'info', label: '프로젝트 소개' },
    { key: 'updates', label: `업데이트 ${updates.length}` },
    { key: 'comments', label: `댓글 ${comments.length}` },
  ] as const

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {project.service_url ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">서비스 체험</h3>
              <div className="relative h-[420px] w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <iframe
                  src={project.service_url}
                  title={`${project.title} 미리보기`}
                  className="absolute inset-0 h-full w-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          ) : null}
          <div className="relative h-72 w-full overflow-hidden rounded-xl bg-slate-100 shadow-inner">
            {project.thumbnail_url ? (
              <Image src={project.thumbnail_url} alt={project.title} fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-300">이미지 없음</div>
            )}
          </div>

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
            {project.short_description && (
              <p className="mt-1 text-gray-600">{project.short_description}</p>
            )}
            <div className="mt-2 flex items-center gap-3 text-sm text-gray-400">
              <span>by <span className="font-medium text-gray-600">{project.user?.name}</span></span>
              <span>&middot;</span>
              <span>{formatDate(project.created_at)}</span>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => openRewardModal()}
                  className="ml-auto text-xs text-gray-500 hover:text-gray-900 underline"
                >
                  리워드 관리
                </button>
              )}
            </div>
          </div>

          <div className="border-b border-gray-200">
            <div className="flex gap-0">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`rounded-t-lg px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    tab === t.key
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {tab === 'info' && (
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
              {project.description || <span className="text-gray-400">소개가 없습니다.</span>}
            </div>
          )}

          {tab === 'updates' && (
            <div className="space-y-4">
              {updates.length === 0 ? (
                <p className="text-sm text-gray-400">업데이트가 없습니다.</p>
              ) : updates.map((u) => (
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
              {comments.length === 0 ? (
                <p className="text-sm text-gray-400">댓글이 없습니다.</p>
              ) : comments.map((c) => (
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

          {isOwner && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">리워드 관리</h3>
                <Button variant="outline" size="sm" onClick={() => openRewardModal()}>
                  리워드 추가
                </Button>
              </div>
              {rewards.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 py-6 text-center text-sm text-gray-500">
                  리워드를 추가하면 후원자가 선택할 수 있습니다.
                </p>
              ) : (
                <ul className="space-y-2">
                  {rewards.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-start justify-between gap-2 rounded-lg border border-gray-200 bg-white p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{r.name ?? (r as { title?: string }).title}</p>
                        <p className="text-xs text-gray-500 line-clamp-1">{r.description}</p>
                        <p className="mt-0.5 text-xs font-semibold text-gray-700">{formatCurrency(r.amount)}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openRewardModal(r)}>수정</Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleDeleteReward(r.id)}>삭제</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {rewards.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">리워드</h3>
              {rewards.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  disabled={!canFund}
                  onClick={() => { setReward(r); setPledgeAmt(String(r.amount)); setPledgeError(''); setPledgeOpen(true) }}
                  className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:border-indigo-300 hover:shadow-md disabled:cursor-default disabled:opacity-60"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">{r.name ?? (r as { title?: string }).title}</span>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(r.amount)}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 line-clamp-2">{r.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={pledgeOpen} onClose={() => setPledgeOpen(false)} title="펀딩하기" size="sm">
        <div className="space-y-4">
          {selectedReward && (
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-700">{selectedReward.name ?? (selectedReward as { title?: string }).title}</p>
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

      <Modal open={rewardModalOpen} onClose={() => setRewardModalOpen(false)} title={editingReward ? '리워드 수정' : '리워드 추가'} size="sm">
        <div className="space-y-4">
          <Input
            label="리워드 이름"
            value={rewardName}
            onChange={(e) => { setRewardName(e.target.value); setRewardError('') }}
            placeholder="예: 얼리버드 1년 이용권"
          />
          <Textarea
            label="설명"
            value={rewardDesc}
            onChange={(e) => { setRewardDesc(e.target.value); setRewardError('') }}
            placeholder="리워드에 대한 설명"
            rows={3}
          />
          <Input
            label="금액 (원)"
            type="number"
            min={0}
            value={rewardAmount}
            onChange={(e) => { setRewardAmount(e.target.value); setRewardError('') }}
            placeholder="0"
          />
          <Select
            label="유형"
            options={REWARD_TYPE_OPTIONS}
            value={rewardType}
            onChange={(e) => setRewardType(e.target.value as 'beta' | 'lifetime' | 'subscription_discount')}
          />
          {rewardError && <p className="text-xs text-red-500">{rewardError}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setRewardModalOpen(false)}>취소</Button>
            <Button loading={rewardSaving} onClick={handleSaveReward}>저장</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

