'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function RegisterPage() {
  const { refresh } = useAuth()
  const router = useRouter()

  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name || !email || !password) { setError('모든 항목을 입력해 주세요'); return }
    if (password.length < 8) { setError('비밀번호는 8자 이상이어야 합니다'); return }
    if (password !== confirm) { setError('비밀번호가 일치하지 않습니다'); return }

    setLoading(true)
    try {
      await api.post('/auth/register', { name, email, password })
      await refresh()
      router.replace('/')
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e?.message ?? '회원가입에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-112px)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">회원가입</h1>
          <p className="mt-1 text-sm text-gray-400">VibeFund와 함께 시작하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="이름"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
            required
          />
          <Input
            label="이메일"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            required
          />
          <Input
            label="비밀번호"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8자 이상"
            hint="영문, 숫자 포함 8자 이상"
            required
          />
          <Input
            label="비밀번호 확인"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="비밀번호 재입력"
            error={confirm && confirm !== password ? '비밀번호가 일치하지 않습니다' : undefined}
            required
          />

          {error && (
            <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          <Button type="submit" fullWidth loading={loading} size="lg" className="mt-2">
            회원가입
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          이미 계정이 있으신가요?{' '}
          <Link href="/auth/login" className="font-medium text-gray-900 hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}
