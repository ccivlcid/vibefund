'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/',             label: '프로젝트' },
  { href: '/projects/new', label: '프로젝트 등록' },
]

export function Header() {
  const { user, loading, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="text-base font-bold tracking-tight text-gray-900">
          VibeFund
        </Link>

        <nav className="flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded px-3 py-1.5 text-sm transition-colors',
                pathname === link.href
                  ? 'bg-gray-100 font-medium text-gray-900'
                  : 'text-gray-500 hover:text-gray-900'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {loading ? null : user ? (
            <>
              <Link
                href="/me"
                className={cn(
                  'rounded px-3 py-1.5 text-sm transition-colors',
                  pathname === '/me'
                    ? 'bg-gray-100 font-medium text-gray-900'
                    : 'text-gray-500 hover:text-gray-900'
                )}
              >
                마이페이지
              </Link>
              {user.role === 'admin' && (
                <Link
                  href="/admin"
                  className={cn(
                    'rounded px-3 py-1.5 text-sm transition-colors',
                    pathname.startsWith('/admin')
                      ? 'bg-gray-100 font-medium text-gray-900'
                      : 'text-gray-500 hover:text-gray-900'
                  )}
                >
                  관리자
                </Link>
              )}
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                로그아웃
              </Button>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">로그인</Button>
              </Link>
              <Link href="/auth/register">
                <Button variant="primary" size="sm">회원가입</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
