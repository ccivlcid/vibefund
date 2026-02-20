'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { PageSpinner } from '@/components/ui/spinner'
import { formatDate } from '@/lib/utils'

interface AdminUser {
  id: string; email: string; name: string; role: 'user' | 'admin'; created_at: string
}

export default function AdminUsersPage() {
  const { user: me, loading: authLoading } = useAuth()
  const router = useRouter()

  const [users, setUsers]       = useState<AdminUser[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    if (!authLoading && (!me || me.role !== 'admin')) router.replace('/')
  }, [me, authLoading, router])

  useEffect(() => {
    if (!me || me.role !== 'admin') return
    api.get<{ data: AdminUser[] }>('/admin/users?limit=100')
      .then((r) => setUsers(r.data))
      .finally(() => setLoading(false))
  }, [me])

  const handleRoleToggle = async () => {
    if (!selected) return
    const newRole = selected.role === 'admin' ? 'user' : 'admin'
    setSubmitting(true)
    setError('')
    try {
      const r = await api.patch<{ data: AdminUser }>(`/admin/users/${selected.id}`, { role: newRole })
      setUsers((us) => us.map((u) => u.id === selected.id ? r.data : u))
      setSelected(null)
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(err?.message ?? '처리 실패')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) return <PageSpinner />

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6">
        <Link href="/admin" className="text-xs text-gray-400 hover:text-gray-700">대시보드</Link>
        <span className="mx-1 text-gray-300">/</span>
        <h1 className="inline text-xl font-bold text-gray-900">사용자 관리</h1>
      </div>

      <div className="mb-3 text-sm text-gray-400">
        전체 <span className="font-medium text-gray-900">{users.length}</span>명
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left font-medium text-gray-600">이름</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">이메일</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">역할</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">가입일</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <Badge variant={u.role === 'admin' ? 'info' : 'muted'}>
                    {u.role === 'admin' ? '관리자' : '일반'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-400">{formatDate(u.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  {u.id !== me?.id && (
                    <Button size="sm" variant="outline" onClick={() => { setSelected(u); setError('') }}>
                      {u.role === 'admin' ? '권한 해제' : '관리자 지정'}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="역할 변경"
        size="sm"
      >
        {selected && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">{selected.name}</span> ({selected.email}) 의 역할을{' '}
              <span className="font-medium">{selected.role === 'admin' ? '일반 사용자' : '관리자'}</span>로 변경하시겠습니까?
            </p>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>취소</Button>
              <Button loading={submitting} onClick={handleRoleToggle}>확인</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
