'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { ProjectCard } from '@/components/projects/project-card'
import { PageSpinner } from '@/components/ui/spinner'

const TABS = [
  { key: 'discussion', label: '자유 토론' },
  { key: 'learning', label: '창업 학습' },
  { key: 'feedback', label: '피드백 요청' },
] as const

interface Project {
  id: string
  title: string
  short_description?: string | null
  category?: string | null
  thumbnail_url: string | null
  status: string
  funding: { goal_amount: number; deadline: string; current_amount?: number; progress_percent?: number }[] | null
  user?: { id: string; name: string; avatar_url?: string | null }
  comments_count?: number
  last_update_at?: string
  vibe_score?: number
  verification_count?: number
}

export default function CommunityPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('discussion')
  const [feedbackProjects, setFeedbackProjects] = useState<Project[]>([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  useEffect(() => {
    if (tab === 'feedback') {
      setFeedbackLoading(true)
      api
        .post<{ data: Project[] }>('/projects/list', { page: 1, limit: 12, sort: 'created_at' })
        .then((res) => setFeedbackProjects(res.data ?? []))
        .catch(() => setFeedbackProjects([]))
        .finally(() => setFeedbackLoading(false))
    }
  }, [tab])

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Community</h1>
        <p className="mt-1 text-slate-500">
          검증 중심의 소통 공간입니다. 노코드·AI·SaaS 관련 주제를 나눌 수 있습니다.
        </p>
      </div>

      <div className="border-b border-slate-200">
        <div className="flex gap-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-t-lg border-b-2 px-4 py-3 text-sm font-medium transition-colors -mb-px ${
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

      {tab === 'discussion' && (
        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-center">
          <p className="text-slate-600">자유 토론 게시판은 준비 중입니다.</p>
          <p className="mt-2 text-sm text-slate-500">
            노코드·AI·SaaS 관련 주제로 토론할 수 있는 공간이 곧 열립니다.
          </p>
        </div>
      )}

      {tab === 'learning' && (
        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-center">
          <p className="text-slate-600">창업 학습 콘텐츠는 준비 중입니다.</p>
          <p className="mt-2 text-sm text-slate-500">
            빌더를 위한 검증·런칭·투자 유치 노하우를 공유할 예정입니다.
          </p>
        </div>
      )}

      {tab === 'feedback' && (
        <div className="mt-8">
          <p className="mb-2 text-sm text-slate-600">
            피드백이 필요한 프로젝트를 둘러보고, 체험 후 검증 질문에 응답하거나 댓글로 의견을 남겨 주세요.
          </p>
          <Link href="/#projects" className="mb-6 inline-block">
            <Button variant="outline" size="sm">
              전체 프로젝트 탐색
            </Button>
          </Link>
          {feedbackLoading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <PageSpinner />
            </div>
          ) : feedbackProjects.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-center">
              <p className="text-slate-500">등록된 프로젝트가 없습니다.</p>
              <Link href="/projects/new" className="mt-4 inline-block">
                <Button variant="primary" size="md">첫 프로젝트 등록하기</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {feedbackProjects.map((p) => (
                <ProjectCard key={p.id} {...p} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
