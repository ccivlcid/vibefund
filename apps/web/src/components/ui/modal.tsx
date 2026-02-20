'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
}

export function Modal({ open, onClose, title, children, className, size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open) el.showModal()
    else el.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={cn(
        'w-full rounded-lg border border-gray-200 bg-white p-0 shadow-lg backdrop:bg-black/40',
        sizeStyles[size],
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        {title && <h2 className="text-base font-semibold text-gray-900">{title}</h2>}
        <Button variant="ghost" size="sm" className="ml-auto" onClick={onClose} aria-label="닫기">
          &#x2715;
        </Button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </dialog>
  )
}
