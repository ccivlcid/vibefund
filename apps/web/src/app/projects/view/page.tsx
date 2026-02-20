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
  { value: 'supporter', label: '서포터' },
  { value: 'lifetime', label: '평생 이용권' },
  { value: 'subscription_discount', label: '구독 할인' },
]

const VIEW_PROJECT_ID_KEY = 'vibefund_view_project_id'

interface Reward { id: string; name?: string; title?: string; description: string; amount: number; type: string }
interface Comment { id: string; content: string; parent_id?: string | null; created_at: string; user: { name: string } }
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
  vibe_score?: number
  verification_count?: number
  last_update_at?: string
  feedback_preference?: 'validation_focus' | 'comments_focus' | 'both' | null
}

export default function ProjectViewPage() {
  const router = useRouter()
  const { user, refresh: refreshUser } = useAuth()

  const [projectId, setProjectId] = useState<string | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'demo' | 'validation' | 'updates' | 'comments'>('overview')
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
  const [rewardType, setRewardType] = useState<'beta' | 'lifetime' | 'subscription_discount' | 'supporter'>('beta')
  const [rewardSaving, setRewardSaving] = useState(false)
  const [rewardError, setRewardError] = useState('')
  const [verificationCounts, setVerificationCounts] = useState<{ q1_use_intent: number; q2_monthly_pay: number; q3_improvement: number } | null>(null)
  const [vq1, setVq1] = useState('')
  const [vq2, setVq2] = useState('')
  const [vq3, setVq3] = useState('')
  const [verificationSubmitting, setVerificationSubmitting] = useState(false)
  const [verificationDone, setVerificationDone] = useState(false)
  const [replyToId, setReplyToId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [reportingId, setReportingId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)

  useEffect(() => {
    const id = typeof window !== 'undefined' ? sessionStorage.getItem(VIEW_PROJECT_ID_KEY) : null
    if (!id) {
      router.replace('/')
      return
    }
    setProjectId(id)
    api.post<{ data: Project }>('/project-detail', { id })
      .then((r) => setProject(r.data))
      .catch(() => router.replace('/'))
      .finally(() => setLoading(false))
  }, [router])

  const refreshProject = () => {
    if (!projectId) return
    api.post<{ data: Project }>('/project-detail', { id: projectId })
      .then((r) => setProject(r.data))
      .catch(() => {})
  }

  const loadVerificationCounts = () => {
    if (!projectId) return
    api.get<{ data: { counts: { q1_use_intent: number; q2_monthly_pay: number; q3_improvement: number } } }>(
      `/projects/${projectId}/verification-responses`
    ).then((r) => setVerificationCounts(r.data.counts)).catch(() => {})
  }

  useEffect(() => {
    if (projectId) loadVerificationCounts()
  }, [projectId])

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) { router.push('/auth/login'); return }
    if (!projectId || (!vq1.trim() && !vq2.trim() && !vq3.trim())) return
    setVerificationSubmitting(true)
    try {
      await api.post(`/projects/${projectId}/verification-responses`, {
        q1_use_intent: vq1.trim() || undefined,
        q2_monthly_pay: vq2.trim() || undefined,
        q3_improvement: vq3.trim() || undefined,
      })
      setVerificationDone(true)
      setVq1(''); setVq2(''); setVq3('')
      loadVerificationCounts()
    } finally {
      setVerificationSubmitting(false)
    }
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
      refreshUser()
    } catch (e: unknown) {
      const err = e as { error?: { message?: string }; message?: string }
      setPledgeError(err?.error?.message ?? err?.message ?? '펀딩 실패')
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
      await api.post(`/projects/${projectId}/comments`, { body: commentText })
      setComment('')
      refreshProject()
    } finally {
      setCommenting(false)
    }
  }

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !projectId || !replyToId || !replyText.trim()) return
    setCommenting(true)
    try {
      await api.post(`/projects/${projectId}/comments`, { body: replyText, parent_id: replyToId })
      setReplyText('')
      setReplyToId(null)
      refreshProject()
    } finally {
      setCommenting(false)
    }
  }

  const handleReport = async () => {
    if (!reportingId) return
    setReportSubmitting(true)
    try {
      await api.post(`/comments/${reportingId}/report`, { reason: reportReason.trim() || undefined })
      setReportingId(null)
      setReportReason('')
      refreshProject()
    } finally {
      setReportSubmitting(false)
    }
  }

  const openRewardModal = (reward?: Reward) => {
    if (reward) {
      setEditingReward(reward)
      setRewardName(reward.name ?? (reward as { title?: string }).title ?? '')
      setRewardDesc(reward.description ?? '')
      setRewardAmount(String(reward.amount))
      setRewardType((reward.type as 'beta' | 'lifetime' | 'subscription_discount' | 'supporter') || 'beta')
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
  const hasFunding = !!f && (f.goal_amount ?? 0) > 0
  const canFund = !isOwner && hasFunding && project.approval_status === 'approved'

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'demo', label: 'Demo' },
    { key: 'validation', label: 'Validation' },
    { key: 'updates', label: `Updates ${updates.length}` },
    { key: 'comments', label: `Comments ${comments.length}` },
  ] as const

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
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
                      ? 'border-teal-600 text-teal-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {project.feedback_preference && (
            <div className="mt-4 rounded-lg border border-teal-100 bg-teal-50/60 px-4 py-3 text-sm text-teal-800">
              {project.feedback_preference === 'validation_focus' && (
                <>이 프로젝트는 <strong>검증 질문 응답</strong>을 우선 받고 있어요. 체험 후 Validation 탭에서 3문항에 응답해 주세요.</>
              )}
              {project.feedback_preference === 'comments_focus' && (
                <>이 프로젝트는 <strong>댓글 피드백</strong>을 우선 받고 있어요. Comments 탭에서 자유롭게 의견을 남겨 주세요.</>
              )}
              {project.feedback_preference === 'both' && (
                <>검증 질문과 댓글 <strong>둘 다</strong> 환영해요. 체험 후 Validation 응답과 Comments 피드백을 남겨 주세요.</>
              )}
            </div>
          )}

          {tab === 'overview' && (
            <div className="space-y-6">
              {/* 신뢰 위젯: Vibe Score, 체험 수, 긍정 응답률, 최근 업데이트 */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {typeof project.vibe_score === 'number' && (
                  <div className="rounded-xl border border-teal-200 bg-teal-50/80 p-4">
                    <p className="text-xs font-medium text-teal-600">Vibe Score</p>
                    <p className="mt-1 text-xl font-bold text-teal-800">{project.vibe_score}</p>
                  </div>
                )}
                {typeof project.verification_count === 'number' && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-xs font-medium text-slate-600">체험 수</p>
                    <p className="mt-1 text-xl font-bold text-slate-800">{project.verification_count}건</p>
                  </div>
                )}
                {verificationCounts && typeof project.verification_count === 'number' && project.verification_count > 0 && (verificationCounts.q1_use_intent > 0 || verificationCounts.q2_monthly_pay > 0 || verificationCounts.q3_improvement > 0) && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-xs font-medium text-slate-600">긍정 응답률</p>
                    <p className="mt-1 text-xl font-bold text-slate-800">
                      {Math.round((verificationCounts.q1_use_intent / project.verification_count) * 100)}%
                    </p>
                    <p className="text-xs text-slate-500">사용 의향 응답</p>
                  </div>
                )}
                {project.last_update_at && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-xs font-medium text-slate-600">최근 업데이트</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{formatDate(project.last_update_at)}</p>
                  </div>
                )}
              </div>
              <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-line">
                {project.description || <span className="text-slate-400">소개가 없습니다.</span>}
              </div>
              {verificationCounts && (verificationCounts.q1_use_intent > 0 || verificationCounts.q2_monthly_pay > 0 || verificationCounts.q3_improvement > 0) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <p className="text-xs font-medium text-slate-500 mb-2">검증 응답 요약</p>
                  <p className="text-sm text-slate-600">사용의향 {verificationCounts.q1_use_intent} · 지불의사 {verificationCounts.q2_monthly_pay} · 개선점 {verificationCounts.q3_improvement}</p>
                </div>
              )}
            </div>
          )}

          {tab === 'demo' && (
            <div className="space-y-4">
              {project.service_url ? (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-sm font-semibold text-slate-800">서비스 체험</h3>
                    <a
                      href={project.service_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-teal-600 hover:underline"
                    >
                      새 창에서 열기 ↗
                    </a>
                  </div>
                  <div className="relative h-[420px] w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <iframe
                      src={project.service_url}
                      title={`${project.title} 미리보기`}
                      className="absolute inset-0 h-full w-full border-0"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    체험 영역은 제작자가 제공한 외부 URL입니다. 결제·개인정보 입력은 권장하지 않습니다.
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500">체험 URL이 없습니다.</p>
              )}
            </div>
          )}

          {tab === 'validation' && (
            <Card padding="md" className="border-teal-100 bg-gradient-to-br from-teal-50/50 to-white">
              <h3 className="mb-1 text-sm font-semibold text-slate-800">검증 질문</h3>
              <p className="mb-4 text-xs text-slate-500">서비스를 체험한 뒤 의견을 남겨 주세요. 제작자와 투자자에게 도움이 됩니다.</p>
              {verificationDone ? (
                <p className="rounded-lg bg-teal-50 py-3 text-center text-sm font-medium text-teal-700">응답이 저장되었습니다. 감사합니다.</p>
              ) : user ? (
                <form onSubmit={handleVerificationSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">1. 이 서비스를 사용할 의향이 있습니까?</label>
                    <Input value={vq1} onChange={(e) => setVq1(e.target.value)} placeholder="예: 네, 매일 사용할 것 같습니다" className="bg-white" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">2. 월 얼마까지 지불 가능합니까?</label>
                    <Input value={vq2} onChange={(e) => setVq2(e.target.value)} placeholder="예: 5,000원" className="bg-white" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">3. 가장 개선이 필요한 부분은?</label>
                    <Input value={vq3} onChange={(e) => setVq3(e.target.value)} placeholder="예: 모바일 UX" className="bg-white" />
                  </div>
                  <Button type="submit" size="md" loading={verificationSubmitting} disabled={!vq1.trim() && !vq2.trim() && !vq3.trim()}>
                    응답 제출
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-slate-500">로그인 후 검증 질문에 응답할 수 있습니다.</p>
              )}
              {verificationCounts && (verificationCounts.q1_use_intent > 0 || verificationCounts.q2_monthly_pay > 0 || verificationCounts.q3_improvement > 0) && (
                <div className="mt-4 flex gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
                  <span>응답 수: 사용의향 {verificationCounts.q1_use_intent} · 지불의사 {verificationCounts.q2_monthly_pay} · 개선점 {verificationCounts.q3_improvement}</span>
                </div>
              )}
            </Card>
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
                <p className="text-sm text-slate-500">댓글이 없습니다.</p>
              ) : (() => {
                const topLevel = comments.filter((c) => !c.parent_id)
                const byParent = new Map<string, Comment[]>()
                for (const c of comments) {
                  if (c.parent_id) {
                    if (!byParent.has(c.parent_id)) byParent.set(c.parent_id, [])
                    byParent.get(c.parent_id)!.push(c)
                  }
                }
                return (
                  <ul className="space-y-4">
                    {topLevel.map((c) => (
                      <li key={c.id} className="border-b border-slate-100 pb-4 last:border-0">
                        <div className="flex gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-medium text-teal-700">
                            {c.user?.name?.[0] ?? 'U'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">{c.user?.name}</span>
                              <span className="text-xs text-slate-400">{formatDate(c.created_at)}</span>
                              {user && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setReplyToId(replyToId === c.id ? null : c.id)}
                                    className="text-xs text-teal-600 hover:underline"
                                  >
                                    답글
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setReportingId(c.id); setReportReason('') }}
                                    className="text-xs text-slate-400 hover:text-red-600"
                                  >
                                    신고
                                  </button>
                                </>
                              )}
                            </div>
                            <p className="mt-0.5 text-sm text-slate-700 whitespace-pre-wrap">{c.content}</p>
                            {replyToId === c.id && (
                              <form onSubmit={handleReply} className="mt-3 flex gap-2">
                                <Input
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder="답글 입력..."
                                  className="flex-1"
                                />
                                <Button type="submit" size="sm" disabled={commenting || !replyText.trim()}>등록</Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => { setReplyToId(null); setReplyText('') }}>취소</Button>
                              </form>
                            )}
                            {(byParent.get(c.id) ?? []).length > 0 && (
                              <ul className="mt-3 ml-4 space-y-2 border-l-2 border-teal-100 pl-4">
                                {(byParent.get(c.id) ?? []).map((r) => (
                                  <li key={r.id} className="flex gap-2">
                                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                                      {r.user?.name?.[0] ?? 'U'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-slate-800">{r.user?.name}</span>
                                        <span className="text-xs text-slate-400">{formatDate(r.created_at)}</span>
                                        {user && (
                                          <button
                                            type="button"
                                            onClick={() => { setReportingId(r.id); setReportReason('') }}
                                            className="text-xs text-slate-400 hover:text-red-600"
                                          >
                                            신고
                                          </button>
                                        )}
                                      </div>
                                      <p className="mt-0.5 text-sm text-slate-600 whitespace-pre-wrap">{r.content}</p>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              })()}
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
                  className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-teal-300 hover:shadow-md disabled:cursor-default disabled:opacity-60"
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

      <Modal open={pledgeOpen} onClose={() => setPledgeOpen(false)} title="후원하기" size="sm">
        <div className="space-y-4">
          {!user ? (
            <>
              <p className="text-sm text-slate-600">후원하려면 로그인해 주세요.</p>
              <Button fullWidth onClick={() => { setPledgeOpen(false); router.push('/auth/login') }}>로그인</Button>
            </>
          ) : (
            <>
              {typeof user.balance === 'number' && (
                <p className="text-sm text-slate-600">보유 잔액: <strong>{user.balance.toLocaleString()}원</strong></p>
              )}
              {selectedReward && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm font-medium text-gray-700">{selectedReward.name ?? (selectedReward as { title?: string }).title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{selectedReward.description}</p>
                </div>
              )}
              <Input
                label="후원 금액 (원)"
                type="number"
                min={1}
                value={pledgeAmt}
                onChange={(e) => { setPledgeAmt(e.target.value); setPledgeError('') }}
                error={pledgeError}
                placeholder="10000"
              />
              {typeof user.balance === 'number' && pledgeAmt && Number(pledgeAmt) > user.balance && (
                <p className="text-xs text-red-600">잔액이 부족합니다.</p>
              )}
              <Button fullWidth loading={pledging} onClick={handlePledge}>
                확인
              </Button>
            </>
          )}
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
            onChange={(e) => setRewardType(e.target.value as 'beta' | 'lifetime' | 'subscription_discount' | 'supporter')}
          />
          {rewardError && <p className="text-xs text-red-500">{rewardError}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setRewardModalOpen(false)}>취소</Button>
            <Button loading={rewardSaving} onClick={handleSaveReward}>저장</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!reportingId} onClose={() => { setReportingId(null); setReportReason('') }} title="댓글 신고" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">신고 사유를 선택하거나 입력해 주세요. 검토 후 조치하겠습니다.</p>
          <Textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="선택: 스팸, 욕설, 개인정보 유출 등"
            rows={3}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setReportingId(null); setReportReason('') }}>취소</Button>
            <Button loading={reportSubmitting} onClick={handleReport}>신고하기</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

