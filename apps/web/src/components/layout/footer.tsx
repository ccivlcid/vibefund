'use client'

import Link from 'next/link'

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              <span className="text-teal-600">Vibe</span>Fund
            </p>
            <p className="mt-1 max-w-xs text-xs text-slate-500">
              한국 1인 빌더를 위한 데이터 기반 Pre-Seed 투자 허브
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
            <Link
              href="/terms"
              className="text-xs text-slate-500 underline decoration-slate-300 underline-offset-2 transition-colors hover:text-slate-700"
            >
              이용약관
            </Link>
            <Link
              href="/privacy"
              className="text-xs text-slate-500 underline decoration-slate-300 underline-offset-2 transition-colors hover:text-slate-700"
            >
              개인정보처리방침
            </Link>
          </div>
        </div>
        <div className="mt-6 border-t border-slate-100 pt-6">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} VibeFund. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
