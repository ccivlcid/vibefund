'use client'

import { useState, useRef, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'

const CATEGORY_OPTIONS = [
  { value: 'AI', label: 'AI' },
  { value: 'SaaS', label: 'SaaS' },
  { value: 'Automation', label: 'Automation' },
  { value: 'No-Code', label: 'No-Code' },
]

const STATUS_OPTIONS = [
  { value: 'Prototype', label: 'Prototype' },
  { value: 'Beta', label: 'Beta' },
  { value: 'Live', label: 'Live' },
]

const FEEDBACK_PREFERENCE_OPTIONS = [
  { value: 'validation_focus', label: '검증 질문 위주', desc: '체험 후 3문항 응답을 우선 받을 때' },
  { value: 'comments_focus', label: '댓글 위주', desc: '자유 피드백·댓글을 우선 받을 때' },
  { value: 'both', label: '둘 다', desc: '검증 질문과 댓글 모두 적극적으로 받을 때' },
]

const REWARD_TYPE_OPTIONS = [
  { value: 'beta', label: '얼리버드 / 베타' },
  { value: 'supporter', label: '서포터' },
  { value: 'lifetime', label: '평생 이용권' },
  { value: 'subscription_discount', label: '구독 할인' },
]

interface RewardDraft {
  tempId: string
  name: string
  description: string
  amount: string
  type: 'beta' | 'lifetime' | 'subscription_discount' | 'supporter'
}

function newRewardDraft(): RewardDraft {
  return {
    tempId: `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    description: '',
    amount: '',
    type: 'beta',
  }
}

interface ProjectForm {
  title: string
  short_description: string
  service_url: string
  description: string
  thumbnail_url: string
  category: string
  status: string
  feedback_preference: string
  goal_amount: string
  deadline: string
}

const INITIAL: ProjectForm = {
  title: '',
  short_description: '',
  service_url: '',
  description: '',
  thumbnail_url: '',
  category: 'SaaS',
  status: 'Prototype',
  feedback_preference: 'both',
  goal_amount: '',
  deadline: '',
}

export default function NewProjectPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [form, setForm] = useState<ProjectForm>(INITIAL)
  const [rewards, setRewards] = useState<RewardDraft[]>([])
  const [errors, setErrors] = useState<Partial<ProjectForm>>({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [thumbnailUploading, setThumbnailUploading] = useState(false)
  const [thumbnailUploadError, setThumbnailUploadError] = useState('')
  const thumbnailFileRef = useRef<HTMLInputElement>(null)

  if (!authLoading && !user) {
    router.replace('/auth/login')
    return null
  }

  const set = (field: keyof ProjectForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((er) => ({ ...er, [field]: undefined }))
  }

  const handleThumbnailFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setThumbnailUploadError('')
    setThumbnailUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/v1/upload/thumbnail', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw json
      const url = (json as { data: { url: string } }).data?.url
      if (url) setForm((f) => ({ ...f, thumbnail_url: url }))
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'error' in err && typeof (err as { error: { message?: string } }).error?.message === 'string'
        ? (err as { error: { message: string } }).error.message
        : '업로드에 실패했습니다.'
      setThumbnailUploadError(msg)
    } finally {
      setThumbnailUploading(false)
      if (thumbnailFileRef.current) thumbnailFileRef.current.value = ''
    }
  }

  const validate = (): boolean => {
    const errs: Partial<ProjectForm> = {}
    if (!form.title.trim()) errs.title = '제목을 입력해 주세요'
    if (!form.short_description.trim()) errs.short_description = '한 줄 소개를 입력해 주세요'
    try {
      if (!form.service_url.trim()) errs.service_url = '서비스 URL을 입력해 주세요'
      else if (!new URL(form.service_url.trim()).href) errs.service_url = '유효한 URL을 입력해 주세요'
    } catch {
      errs.service_url = '유효한 URL을 입력해 주세요'
    }
    if (form.goal_amount && Number(form.goal_amount) < 100000) errs.goal_amount = '목표 금액은 최소 10만 원 이상 입력해 주세요'
    if (form.deadline && form.goal_amount && !form.deadline.trim()) errs.deadline = '마감일을 입력해 주세요'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setApiError('')
    if (!validate()) return
    setLoading(true)
    try {
      const res = await api.post<{ data: { id: string } }>('/projects', {
        title: form.title.trim(),
        short_description: form.short_description.trim(),
        service_url: form.service_url.trim(),
        description: form.description.trim() || undefined,
        thumbnail_url: form.thumbnail_url.trim() || undefined,
        category: form.category || undefined,
        status: form.status as 'Prototype' | 'Beta' | 'Live',
        feedback_preference: (form.feedback_preference && ['validation_focus', 'comments_focus', 'both'].includes(form.feedback_preference))
          ? form.feedback_preference as 'validation_focus' | 'comments_focus' | 'both'
          : undefined,
      })
      const projectId = res.data.id
      if (form.goal_amount && Number(form.goal_amount) >= 100000 && form.deadline?.trim()) {
        await api.put(`/projects/${projectId}/funding`, {
          goal_amount: Number(form.goal_amount),
          deadline: form.deadline.trim(),
        })
      }
      for (const r of rewards) {
        const name = r.name.trim()
        const description = r.description.trim()
        const amount = Number(r.amount)
        if (name && description && !Number.isNaN(amount) && amount >= 0) {
          await api.post(`/projects/${projectId}/rewards`, {
            name,
            description,
            amount,
            type: r.type,
          })
        }
      }
      sessionStorage.setItem('vibefund_view_project_id', projectId)
      router.push('/projects/view')
    } catch (err: unknown) {
      const e = err as { error?: { message?: string }; message?: string }
      setApiError(e?.error?.message ?? e?.message ?? '프로젝트 생성에 실패했습니다. 입력 내용을 확인해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/90">
      {/* 상단 히어로 */}
      <div className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-teal-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Discover로 돌아가기
          </Link>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            새 프로젝트 등록
          </h1>
          <p className="mt-2 text-slate-600">
            서비스를 소개하고 체험 URL을 등록하면 검토 후 공개됩니다. 펀딩은 선택 사항입니다.
          </p>
          <div className="mt-6 flex gap-1.5" aria-hidden>
            <span className="text-xs font-medium text-slate-400">Step 1 · 2 · 3 · 4</span>
            <div className="ml-2 flex flex-1 gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-1 flex-1 rounded-full bg-teal-500/80" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Step 1: 기본 정보 */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500 text-sm font-bold text-white shadow-sm">
                1
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">기본 정보</h2>
                <p className="text-sm text-slate-500">제목, 소개, 체험 URL, 카테고리·상태를 입력하세요</p>
              </div>
            </div>
            <div className="space-y-5">
              <Input
                label="프로젝트 제목"
                value={form.title}
                onChange={set('title')}
                placeholder="예: 노코드 대시보드 빌더"
                error={errors.title}
                required
                className="rounded-xl"
              />
              <Input
                label="한 줄 소개"
                value={form.short_description}
                onChange={set('short_description')}
                placeholder="한 문장으로 서비스를 소개해 주세요"
                error={errors.short_description}
                required
                className="rounded-xl"
              />
              <Input
                label="서비스 URL (체험 링크)"
                type="url"
                value={form.service_url}
                onChange={set('service_url')}
                placeholder="https://your-app.vercel.app"
                error={errors.service_url}
                hint="방문자가 체험할 수 있는 웹 주소"
                required
                className="rounded-xl"
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <Select
                  label="카테고리"
                  options={CATEGORY_OPTIONS}
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                />
                <Select
                  label="서비스 상태"
                  options={STATUS_OPTIONS}
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  hint="현재 단계"
                />
              </div>
              <Textarea
                label="상세 설명 (선택)"
                value={form.description}
                onChange={set('description')}
                placeholder="기능, 타깃, 차별점 등을 자유롭게 적어 주세요"
                error={errors.description}
                rows={5}
                className="rounded-xl resize-none"
              />
              {/* 썸네일: URL 입력 또는 파일 업로드 */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">썸네일 이미지 (선택)</label>
                <Input
                  type="url"
                  value={form.thumbnail_url}
                  onChange={set('thumbnail_url')}
                  placeholder="https://example.com/og-image.png"
                  className="rounded-xl"
                />
                <p className="text-xs text-slate-500">카드에 노출될 이미지. URL을 입력하거나 아래에서 파일을 선택하세요.</p>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-slate-400">또는</span>
                  <label className="cursor-pointer rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                    <input
                      ref={thumbnailFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="sr-only"
                      disabled={thumbnailUploading}
                      onChange={handleThumbnailFile}
                    />
                    {thumbnailUploading ? '업로드 중…' : '파일로 업로드'}
                  </label>
                </div>
                {thumbnailUploadError && (
                  <p className="text-sm text-red-600">{thumbnailUploadError}</p>
                )}
                {form.thumbnail_url && (
                  <div className="mt-2">
                    <p className="mb-1 text-xs text-slate-500">미리보기</p>
                    <img
                      src={form.thumbnail_url}
                      alt="썸네일 미리보기"
                      className="h-24 w-auto max-w-[200px] rounded-lg border border-slate-200 object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Step 2: 검증 설정 */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500 text-sm font-bold text-white shadow-sm">
                2
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">검증 설정</h2>
                <p className="text-sm text-slate-500">어떤 피드백을 우선 받을지 선택하세요</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-1">
              {FEEDBACK_PREFERENCE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer gap-4 rounded-xl border-2 p-4 transition-all ${
                    form.feedback_preference === opt.value
                      ? 'border-teal-500 bg-teal-50/70 shadow-sm'
                      : 'border-slate-200 bg-slate-50/30 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="feedback_preference"
                    value={opt.value}
                    checked={form.feedback_preference === opt.value}
                    onChange={() => setForm((f) => ({ ...f, feedback_preference: opt.value }))}
                    className="mt-1 h-4 w-4 border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-900">{opt.label}</span>
                    <p className="mt-0.5 text-sm text-slate-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Step 3: 리워드 (선택) */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500 text-sm font-bold text-white shadow-sm">
                3
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">리워드 (선택)</h2>
                <p className="text-sm text-slate-500">후원 금액별 리워드를 추가하면 후원자가 선택할 수 있어요</p>
              </div>
            </div>
            <div className="space-y-4">
              {rewards.map((r, idx) => (
                <div
                  key={r.tempId}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">리워드 {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => setRewards((prev) => prev.filter((x) => x.tempId !== r.tempId))}
                      className="text-xs text-slate-400 hover:text-red-600"
                    >
                      삭제
                    </button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="리워드 이름"
                      value={r.name}
                      onChange={(e) =>
                        setRewards((prev) =>
                          prev.map((x) => (x.tempId === r.tempId ? { ...x, name: e.target.value } : x))
                        )
                      }
                      placeholder="예: 얼리버드 1년 이용권"
                      className="rounded-xl"
                    />
                    <Input
                      label="금액 (원)"
                      type="number"
                      min={0}
                      value={r.amount}
                      onChange={(e) =>
                        setRewards((prev) =>
                          prev.map((x) => (x.tempId === r.tempId ? { ...x, amount: e.target.value } : x))
                        )
                      }
                      placeholder="0"
                      className="rounded-xl"
                    />
                  </div>
                  <Textarea
                    label="설명"
                    value={r.description}
                    onChange={(e) =>
                      setRewards((prev) =>
                        prev.map((x) => (x.tempId === r.tempId ? { ...x, description: e.target.value } : x))
                      )
                    }
                    placeholder="리워드에 대한 설명"
                    rows={2}
                    className="rounded-xl resize-none"
                  />
                  <Select
                    label="유형"
                    options={REWARD_TYPE_OPTIONS}
                    value={r.type}
                    onChange={(e) =>
                      setRewards((prev) =>
                        prev.map((x) =>
                          x.tempId === r.tempId
                            ? { ...x, type: e.target.value as RewardDraft['type'] }
                            : x
                        )
                      )
                    }
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => setRewards((prev) => [...prev, newRewardDraft()])}
                className="w-full rounded-xl border-dashed border-slate-300 text-slate-600 hover:border-teal-400 hover:text-teal-600"
              >
                + 리워드 추가
              </Button>
            </div>
          </section>

          {/* Step 4: 펀딩 (선택) */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-300 text-sm font-bold text-white shadow-sm">
                4
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">펀딩 (선택)</h2>
                <p className="text-sm text-slate-500">목표 금액·마감일을 설정하면 후원을 받을 수 있어요</p>
              </div>
            </div>
            <div className="space-y-5">
              <Input
                label="목표 금액 (원)"
                type="number"
                min={100000}
                value={form.goal_amount}
                onChange={set('goal_amount')}
                placeholder="비워두면 펀딩 없이 등록"
                hint="최소 10만 원 (비워두면 펀딩 없음)"
                error={errors.goal_amount}
                className="rounded-xl"
              />
              <Input
                label="마감일"
                type="date"
                value={form.deadline}
                onChange={set('deadline')}
                error={errors.deadline}
                hint="목표 금액을 넣었을 때만 필요"
                min={new Date().toISOString().split('T')[0]}
                className="rounded-xl"
              />
            </div>
          </section>

          {apiError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              <span className="shrink-0 text-red-500" aria-hidden>⚠</span>
              <p className="flex-1">{apiError}</p>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-4 sm:pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="rounded-xl sm:min-w-[7rem]"
            >
              취소
            </Button>
            <Button
              type="submit"
              loading={loading}
              className="rounded-xl bg-teal-600 px-8 hover:bg-teal-500 sm:min-w-[10rem]"
            >
              {loading ? '등록 중…' : '프로젝트 등록'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
