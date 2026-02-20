'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { PageSpinner } from '@/components/ui/spinner'

/**
 * 로그인·회원가입 외 모든 경로는 로그인 필수.
 * 비로그인 시 /auth/login 으로 리다이렉트.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useAuth()

  const isAuthPage = pathname?.startsWith('/auth/')

  useEffect(() => {
    if (loading) return
    if (isAuthPage) return
    if (!user) {
      router.replace('/auth/login')
    }
  }, [loading, user, isAuthPage, router])

  if (isAuthPage) {
    return <>{children}</>
  }
  if (loading || !user) {
    return <PageSpinner />
  }
  return <>{children}</>
}
