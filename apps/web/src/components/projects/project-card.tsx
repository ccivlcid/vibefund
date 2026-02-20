'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatCurrency, formatDateShort, daysLeft, progressPercent, truncate } from '@/lib/utils'

interface FundingInfo {
  goal_amount: number
  current_amount?: number
  deadline: string
  progress_percent?: number
}

interface ProjectCardProps {
  id: string
  title: string
  short_description?: string | null
  category?: string | null
  thumbnail_url: string | null
  status: string
  funding: FundingInfo | FundingInfo[] | null
  user?: { id: string; name: string; avatar_url?: string | null } | null
  comments_count?: number
  last_update_at?: string
  vibe_score?: number
  verification_count?: number
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: 'success' | 'info' | 'muted' | 'warning' }> = {
    active: { label: '진행중', variant: 'success' },
    draft: { label: '초안', variant: 'muted' },
    completed: { label: '완료', variant: 'info' },
    cancelled: { label: '취소', variant: 'warning' },
    Prototype: { label: 'Prototype', variant: 'muted' },
    Beta: { label: 'Beta', variant: 'info' },
    Live: { label: 'Live', variant: 'success' },
  }
  return map[status] ?? { label: status, variant: 'muted' }
}

const VIEW_PROJECT_ID_KEY = 'vibefund_view_project_id'

export function ProjectCard({
  id,
  title,
  short_description,
  category,
  thumbnail_url,
  status,
  funding,
  user,
  comments_count = 0,
  last_update_at,
  vibe_score,
  verification_count = 0,
}: ProjectCardProps) {
  const router = useRouter()
  const f = Array.isArray(funding) ? funding[0] : funding
  const goal = f?.goal_amount ?? 0
  const current = f?.current_amount ?? 0
  const pct = f?.progress_percent ?? progressPercent(current, goal)
  const days = f?.deadline ? daysLeft(f.deadline) : null
  const badge = getStatusBadge(status)

  const goToView = () => {
    sessionStorage.setItem(VIEW_PROJECT_ID_KEY, id)
    router.push('/projects/view')
  }

  return (
    <button type="button" onClick={goToView} className="group block w-full text-left">
      <article className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:border-teal-200/80">
        {/* Thumbnail */}
        <div className="relative h-44 w-full overflow-hidden bg-slate-100 sm:h-52">
          {thumbnail_url ? (
            <Image
              src={thumbnail_url}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
              <svg className="h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          {/* Category pill on image */}
          {category && (
            <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm">
              {category}
            </span>
          )}
        </div>

        <div className="p-5">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
          <h3 className="text-lg font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-teal-800">
            {truncate(title, 50)}
          </h3>
          {short_description && (
            <p className="mt-2 line-clamp-2 text-sm text-slate-600">
              {truncate(short_description, 80)}
            </p>
          )}
          {user?.name && (
            <p className="mt-2 text-xs text-slate-500">by {user.name}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            {typeof vibe_score === 'number' && vibe_score > 0 && (
              <span className="font-medium text-teal-600">Vibe {vibe_score}</span>
            )}
            {verification_count > 0 && <span>체험 {verification_count}건</span>}
            {comments_count > 0 && <span>댓글 {comments_count}</span>}
            {last_update_at && (
              <span>업데이트 {formatDateShort(last_update_at)}</span>
            )}
          </div>

          {f && goal > 0 && (
            <div className="mt-4 space-y-2 rounded-xl bg-slate-50/80 p-3">
              <Progress value={pct} />
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">{formatCurrency(current)}</span>
                <span className="font-medium text-teal-600">{pct}%</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>목표 {formatCurrency(goal)}</span>
                {days !== null && (
                  <span>{days > 0 ? `${days}일 남음` : '종료'}</span>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <span className="inline-flex flex-1 items-center justify-center rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white">
              체험하기
            </span>
            <span className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
              피드백
            </span>
          </div>
        </div>
      </article>
    </button>
  )
}
