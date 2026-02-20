'use client'

import { cn } from '@/lib/utils'
import { getMemberInitial } from './member-icons'

export interface AiBoardMember {
  id: string
  key: string
  display_name: string
  perspective: string | null
  default_weight_percent: number
  sort_order: number
}

interface AiBoardMemberSelectorProps {
  members: AiBoardMember[]
  selectedIds: string[]
  onChange: (selectedIds: string[]) => void
  disabled?: boolean
  className?: string
}

export function AiBoardMemberSelector({
  members,
  selectedIds,
  onChange,
  disabled,
  className,
}: AiBoardMemberSelectorProps) {
  const toggle = (id: string) => {
    if (disabled) return
    if (selectedIds.includes(id)) {
      if (selectedIds.length <= 1) return
      onChange(selectedIds.filter((x) => x !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-sm text-slate-500">
        이 프로젝트를 심사할 <strong>AI 위원</strong>을 골라 주세요. 최소 1명 이상 선택해요.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {members.map((m) => {
          const isSelected = selectedIds.includes(m.id)
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.id)}
              disabled={disabled}
              className={cn(
                'group flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200',
                'hover:border-teal-400/80 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2',
                isSelected
                  ? 'border-teal-500 bg-teal-50/80 shadow-sm'
                  : 'border-slate-200 bg-white hover:bg-slate-50/50',
                disabled && 'cursor-not-allowed opacity-70'
              )}
            >
              <span
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold transition-transform duration-200 group-hover:scale-105',
                  isSelected ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'
                )}
              >
                {getMemberInitial(m.key)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{m.display_name}</span>
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors',
                      isSelected ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 bg-white text-slate-400'
                    )}
                  >
                    {isSelected ? '✓' : ''}
                  </span>
                </div>
                {m.perspective && (
                  <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{m.perspective}</p>
                )}
              </div>
            </button>
          )
        })}
      </div>
      {selectedIds.length > 0 && (
        <p className="text-xs text-slate-400">
          {selectedIds.length}명 선택됨 · 위원을 빼려면 카드를 다시 눌러 주세요
        </p>
      )}
    </div>
  )
}
