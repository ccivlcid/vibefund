'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { PageSpinner } from '@/components/ui/spinner'

interface DashboardStats {
  total_users: number
  total_projects: number
  pending_approval: number
  new_users_this_week: number
  new_projects_this_week: number
}

interface StatCardProps {
  label: string
  value: number
  sub?: string
  href?: string
}

function StatCard({ label, value, sub, href }: StatCardProps) {
  const content = (
    <Card padding="md" className={href ? 'transition-shadow hover:shadow-md cursor-pointer' : ''}>
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </Card>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats]     = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.replace('/')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user || user.role !== 'admin') return
    api.post<{ data: DashboardStats }>('/admin/dashboard', {})
      .then((r) => setStats(r.data))
      .finally(() => setLoading(false))
  }, [user])

  if (authLoading || loading) return <PageSpinner />
  if (!stats) return null

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
        <div className="flex gap-2 text-sm">
          <Link href="/admin/projects" className="text-gray-500 hover:text-gray-900 underline">프로젝트 관리</Link>
          <span className="text-gray-200">|</span>
          <Link href="/admin/users" className="text-gray-500 hover:text-gray-900 underline">사용자 관리</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="전체 사용자" value={stats.total_users} href="/admin/users" />
        <StatCard label="전체 프로젝트" value={stats.total_projects} href="/admin/projects" />
        <StatCard
          label="승인 대기"
          value={stats.pending_approval}
          href="/admin/projects"
          sub="즉시 처리 필요"
        />
        <StatCard label="이번 주 신규 사용자" value={stats.new_users_this_week} sub="최근 7일" />
        <StatCard label="이번 주 신규 프로젝트" value={stats.new_projects_this_week} sub="최근 7일" />
      </div>

      {stats.pending_approval > 0 && (
        <div className="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
          <p className="text-sm text-yellow-800">
            승인 대기 중인 프로젝트가{' '}
            <span className="font-bold">{stats.pending_approval}개</span> 있습니다.{' '}
            <Link href="/admin/projects" className="underline font-medium">바로 처리하기</Link>
          </p>
        </div>
      )}
    </div>
  )
}
