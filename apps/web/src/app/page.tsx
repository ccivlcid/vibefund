'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { ProjectCard } from '@/components/projects/project-card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { PageSpinner } from '@/components/ui/spinner'

interface Project {
  id: string
  title: string
  thumbnail_url: string | null
  status: string
  approval_status: string
  funding: { goal_amount: number; deadline: string }[]
}

interface PaginatedResponse {
  data: Project[]
  meta: { total: number; page: number; limit: number; total_pages: number }
}

const STATUS_OPTIONS = [
  { value: '',          label: '전체 상태' },
  { value: 'active',    label: '진행중' },
  { value: 'completed', label: '완료' },
]

const SORT_OPTIONS = [
  { value: 'created_at', label: '최신순' },
  { value: 'deadline',   label: '마감 임박순' },
]

const LIMIT = 12

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('')
  const [sort, setSort]         = useState('created_at')
  const [query, setQuery]       = useState('')

  const fetchProjects = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await api.post<PaginatedResponse>('/projects/list', {
        page: p,
        limit: LIMIT,
        sort: sort as 'created_at' | 'deadline',
        ...(status && { status }),
        ...(query && { search: query }),
      })
      setProjects(res.data)
      setTotal(res.meta.total)
      setPage(p)
    } catch {
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [status, sort, query])

  useEffect(() => { fetchProjects(1) }, [fetchProjects])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery(search)
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Hero */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          창의적인 프로젝트를 지원하세요
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
          실제 서비스를 체험하고, 마음에 드는 프로젝트에 후원하세요
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <Input
            placeholder="프로젝트 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-xl border-gray-300"
          />
          <Button type="submit" variant="secondary" size="md" className="rounded-xl">검색</Button>
        </form>
        <div className="flex gap-2">
          <Select
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-36 rounded-xl"
          />
          <Select
            options={SORT_OPTIONS}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="w-36 rounded-xl"
          />
        </div>
      </div>

      {/* Results header */}
      <div className="mb-6 text-sm text-gray-600">
        총 <span className="font-semibold text-gray-900">{total}</span>개의 프로젝트
      </div>

      {/* Grid */}
      {loading ? (
        <PageSpinner />
      ) : projects.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-gray-200 bg-white/60 py-12">
          <p className="text-gray-500">프로젝트가 없습니다</p>
          {query && (
            <Button variant="outline" size="sm" onClick={() => { setSearch(''); setQuery('') }} className="rounded-lg">
              검색 초기화
            </Button>
          )}
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
        <div className="mt-12 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => fetchProjects(page - 1)}
            className="rounded-lg"
          >
            이전
          </Button>
          <span className="px-4 text-sm text-gray-600">
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
        </div>
      )}
    </div>
  )
}
