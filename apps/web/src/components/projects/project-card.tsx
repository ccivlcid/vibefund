import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatCurrency, daysLeft, progressPercent, truncate } from '@/lib/utils'

interface FundingInfo {
  goal_amount: number
  current_amount?: number
  deadline: string
  progress_percent?: number
}

interface ProjectCardProps {
  id: string
  title: string
  thumbnail_url: string | null
  status: string
  funding: FundingInfo | FundingInfo[] | null
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: 'success' | 'info' | 'muted' | 'warning' }> = {
    active:    { label: '진행중', variant: 'success' },
    draft:     { label: '초안',   variant: 'muted' },
    completed: { label: '완료',   variant: 'info' },
    cancelled: { label: '취소',   variant: 'warning' },
  }
  return map[status] ?? { label: status, variant: 'muted' }
}

export function ProjectCard({ id, title, thumbnail_url, status, funding }: ProjectCardProps) {
  const f = Array.isArray(funding) ? funding[0] : funding
  const goal = f?.goal_amount ?? 0
  const current = f?.current_amount ?? 0
  const pct = f?.progress_percent ?? progressPercent(current, goal)
  const days = f?.deadline ? daysLeft(f.deadline) : null
  const badge = getStatusBadge(status)

  return (
    <Link href={`/projects/${id}`} className="group block">
      <article className="rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-md overflow-hidden">
        <div className="relative h-44 w-full bg-gray-100">
          {thumbnail_url ? (
            <Image
              src={thumbnail_url}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-300">
              이미지 없음
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
              {truncate(title, 60)}
            </h3>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>

          {f && (
            <div className="mt-3 space-y-2">
              <Progress value={pct} />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  <span className="font-semibold text-gray-900">{formatCurrency(current)}</span>
                  {' '}달성
                </span>
                <span className="font-medium text-gray-700">{pct}%</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>목표 {formatCurrency(goal)}</span>
                {days !== null && (
                  <span>{days > 0 ? `${days}일 남음` : '종료'}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </article>
    </Link>
  )
}
