'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface ProjectForm {
  title: string
  description: string
  thumbnail_url: string
  goal_amount: string
  deadline: string
}

const INITIAL: ProjectForm = {
  title: '', description: '', thumbnail_url: '', goal_amount: '', deadline: '',
}

export default function NewProjectPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [form, setForm]     = useState<ProjectForm>(INITIAL)
  const [errors, setErrors] = useState<Partial<ProjectForm>>({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  if (!authLoading && !user) {
    router.replace('/auth/login')
    return null
  }

  const set = (field: keyof ProjectForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((er) => ({ ...er, [field]: undefined }))
  }

  const validate = (): boolean => {
    const errs: Partial<ProjectForm> = {}
    if (!form.title.trim())       errs.title = '제목을 입력해 주세요'
    if (!form.description.trim()) errs.description = '설명을 입력해 주세요'
    if (!form.goal_amount || Number(form.goal_amount) < 1) errs.goal_amount = '목표 금액을 입력해 주세요'
    if (!form.deadline)           errs.deadline = '마감일을 입력해 주세요'
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
        description: form.description.trim(),
        thumbnail_url: form.thumbnail_url.trim() || null,
        status: 'draft',
      })
      const projectId = res.data.id
      await api.put(`/projects/${projectId}/funding`, {
        goal_amount: Number(form.goal_amount),
        deadline: new Date(form.deadline).toISOString(),
      })
      router.push(`/projects/${projectId}`)
    } catch (err: unknown) {
      const e = err as { message?: string }
      setApiError(e?.message ?? '프로젝트 생성 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">프로젝트 등록</h1>
        <p className="mt-1 text-sm text-gray-400">새 프로젝트를 등록하고 펀딩을 시작하세요</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card padding="md">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">기본 정보</h2>
          <div className="space-y-4">
            <Input
              label="프로젝트 제목"
              value={form.title}
              onChange={set('title')}
              placeholder="프로젝트 이름을 입력하세요"
              error={errors.title}
              required
            />
            <Textarea
              label="프로젝트 설명"
              value={form.description}
              onChange={set('description')}
              placeholder="프로젝트에 대해 자세히 설명해 주세요"
              error={errors.description}
              rows={6}
            />
            <Input
              label="썸네일 이미지 URL"
              type="url"
              value={form.thumbnail_url}
              onChange={set('thumbnail_url')}
              placeholder="https://example.com/image.jpg"
              hint="이미지 URL을 직접 입력해 주세요 (선택)"
            />
          </div>
        </Card>

        <Card padding="md">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">펀딩 정보</h2>
          <div className="space-y-4">
            <Input
              label="목표 금액 (원)"
              type="number"
              min={1}
              value={form.goal_amount}
              onChange={set('goal_amount')}
              placeholder="1000000"
              error={errors.goal_amount}
              required
            />
            <Input
              label="마감일"
              type="date"
              value={form.deadline}
              onChange={set('deadline')}
              error={errors.deadline}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
        </Card>

        {apiError && (
          <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-600">{apiError}</p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            취소
          </Button>
          <Button type="submit" loading={loading}>
            프로젝트 등록
          </Button>
        </div>
      </form>
    </div>
  )
}
