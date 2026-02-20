'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { ProjectCard } from '@/components/projects/project-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageSpinner } from '@/components/ui/spinner'

interface Project {
  id: string
  title: string
  short_description?: string | null
  category?: string | null
  thumbnail_url: string | null
  status: string
  approval_status: string
  funding: { goal_amount: number; deadline: string; current_amount?: number; progress_percent?: number }[]
  user?: { id: string; name: string; avatar_url?: string | null }
  comments_count?: number
  last_update_at?: string
  vibe_score?: number
  verification_count?: number
}

interface PaginatedResponse {
  data: Project[]
  meta: { total: number; page: number; limit: number; total_pages: number }
}

const CATEGORY_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'AI', label: 'AI' },
  { value: 'SaaS', label: 'SaaS' },
  { value: 'Automation', label: 'Automation' },
  { value: 'No-Code', label: 'No-Code' },
]

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'Prototype', label: 'Prototype' },
  { value: 'Beta', label: 'Beta' },
  { value: 'Live', label: 'Live' },
]

const SORT_OPTIONS = [
  { value: 'created_at', label: '최신순' },
  { value: 'deadline', label: '마감 임박순' },
  { value: 'comments_count', label: '댓글순' },
  { value: 'vibe_score', label: 'Vibe Score' },
]

const LIMIT = 12

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('created_at')
  const [searchQuery, setSearchQuery] = useState('')
  const [thisWeekProjects, setThisWeekProjects] = useState<Project[]>([])

  const fetchProjects = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await api.post<PaginatedResponse>('/projects/list', {
        page: p,
        limit: LIMIT,
        sort: sort as 'created_at' | 'deadline' | 'comments_count' | 'vibe_score',
        ...(category && { category }),
        ...(status && { status }),
        ...(searchQuery && { search: searchQuery }),
      })
      setProjects(res.data ?? [])
      setTotal(res.meta?.total ?? 0)
      setPage(p)
    } catch {
      setProjects([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [category, status, sort, searchQuery])

  useEffect(() => {
    fetchProjects(1)
  }, [fetchProjects])

  useEffect(() => {
    api.post<PaginatedResponse>('/projects/list', { page: 1, limit: 6, sort: 'created_at' })
      .then((r) => setThisWeekProjects(r.data ?? []))
      .catch(() => setThisWeekProjects([]))
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchInput.trim())
    fetchProjects(1)
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900/30 px-4 pt-16 pb-24 text-white sm:pt-20 sm:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(20,184,166,0.25),transparent)]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-teal-300/90">
            데이터 기반 Pre-Seed 투자 허브
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            당신의 아이디어를
            <br />
            <span className="bg-gradient-to-r from-teal-300 to-teal-100 bg-clip-text text-transparent">
              사용자 반응 데이터로 증명하세요
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-slate-300 sm:text-lg">
            서비스를 올리고, 체험 데이터를 쌓고, 검증 점수를 만드세요.
            <br className="hidden sm:block" />
            아이디어 → 데이터 → 신뢰 → 투자
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/projects/new">
              <Button size="lg" className="bg-teal-500 text-white shadow-lg hover:bg-teal-400">
                프로젝트 등록하기
              </Button>
            </Link>
            <Link href="/#projects">
              <Button variant="outline" size="lg" className="border-slate-500/50 bg-transparent text-white hover:bg-white/10">
                프로젝트 둘러보기
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* This Week Top */}
      {thisWeekProjects.length > 0 && (
        <section className="border-b border-slate-200/80 bg-white/50 py-10">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-lg font-bold text-slate-900">This Week Top</h2>
            <p className="mt-0.5 text-sm text-slate-500">최근 등록된 프로젝트</p>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {thisWeekProjects.slice(0, 6).map((p) => (
                <ProjectCard key={p.id} {...p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Filters + List */}
      <section id="projects" className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">프로젝트 탐색</h2>
          <p className="mt-1 text-sm text-slate-500">체험하고 검증할 수 있는 빌더 프로젝트를 만나보세요.</p>
        </div>

        {/* Search + Category pills + Sort */}
        <div className="mb-8 space-y-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="프로젝트 제목·한 줄 소개로 검색..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="max-w-md rounded-xl border-slate-300 bg-white shadow-sm"
            />
            <Button type="submit" variant="secondary" size="md" className="rounded-xl">
              검색
            </Button>
          </form>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={opt.value || 'all'}
                  type="button"
                  onClick={() => setCategory(opt.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    category === opt.value
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <span className="mx-1 self-center text-slate-300">|</span>
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value || 'status-all'}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    status === opt.value
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">정렬</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            총 <span className="font-semibold text-slate-900">{total}</span>개의 프로젝트
          </p>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <PageSpinner />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-16">
            <div className="rounded-full bg-slate-200/80 p-4">
              <svg className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-medium text-slate-700">아직 등록된 프로젝트가 없어요</p>
              <p className="mt-1 text-sm text-slate-500">
                {searchQuery || category || status ? '검색 조건을 바꿔 보거나, 첫 프로젝트를 등록해 보세요.' : '첫 프로젝트를 등록해 보세요.'}
              </p>
            </div>
            <div className="flex gap-3">
              {(searchQuery || category || status) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchInput('')
                    setSearchQuery('')
                    setCategory('')
                    setStatus('')
                  }}
                  className="rounded-lg"
                >
                  조건 초기화
                </Button>
              )}
              <Link href="/projects/new">
                <Button size="sm" className="rounded-lg">프로젝트 등록</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} {...p} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="mt-12 flex items-center justify-center gap-2" aria-label="페이지 네비게이션">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => fetchProjects(page - 1)}
              className="rounded-lg"
            >
              이전
            </Button>
            <span className="min-w-[6rem] px-4 text-center text-sm text-slate-600">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => fetchProjects(page + 1)}
              className="rounded-lg"
            >
              다음
            </Button>
          </nav>
        )}
      </section>
    </div>
  )
}
