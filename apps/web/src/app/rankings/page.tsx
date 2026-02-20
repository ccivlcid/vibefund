'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { ProjectCard } from '@/components/projects/project-card'
import { PageSpinner } from '@/components/ui/spinner'

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

interface RankingsData {
  this_week: Project[]
  most_comments: Project[]
  top_vibe: Project[]
}

export default function RankingsPage() {
  const [data, setData] = useState<RankingsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<{ data: RankingsData }>('/rankings')
      .then((res) => {
        if (res?.data) setData(res.data)
        else setData({ this_week: [], most_comments: [], top_vibe: [] })
      })
      .catch(() => setData({ this_week: [], most_comments: [], top_vibe: [] }))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <PageSpinner />
      </div>
    )
  }

  const sections = [
    { key: 'this_week' as const, title: '이번 주 인기', subtitle: '최근 등록된 프로젝트', list: data?.this_week ?? [] },
    { key: 'most_comments' as const, title: '댓글 많은 순', subtitle: '피드백이 활발한 프로젝트', list: data?.most_comments ?? [] },
    { key: 'top_vibe' as const, title: 'Vibe Score Top', subtitle: '검증·참여 점수가 높은 프로젝트', list: data?.top_vibe ?? [] },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">랭킹</h1>
        <p className="mt-1 text-slate-500">인기·참여·검증 점수로 정렬한 프로젝트를 확인하세요.</p>
      </div>

      <div className="space-y-14">
        {sections.map(({ title, subtitle, list }) => (
          <section key={title}>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
            {list.length === 0 ? (
              <p className="mt-6 text-sm text-slate-400">등록된 프로젝트가 없습니다.</p>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((p) => (
                  <ProjectCard key={p.id} {...p} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
