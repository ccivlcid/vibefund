'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'

const TABS = [
  { key: 'discussion', label: '자유 토론' },
  { key: 'learning', label: '창업 학습' },
  { key: 'chat', label: '채팅' },
] as const

type TabKey = (typeof TABS)[number]['key']
type BoardKey = 'discussion' | 'learning'

interface PostUser {
  id: string
  name: string | null
  avatar_url: string | null
}

interface PostItem {
  id: string
  board: string
  title: string
  body: string
  created_at: string
  updated_at: string
  user: PostUser | null
}

interface ListResponse {
  data: PostItem[]
  meta: { page: number; limit: number; total: number }
}

interface ChatRoom {
  id: string
  key: string
  name: string
  created_at: string
}

export default function CommunityPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<TabKey>('discussion')
  const [posts, setPosts] = useState<PostItem[]>([])
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formBody, setFormBody] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [chatRoomsLoading, setChatRoomsLoading] = useState(false)

  const fetchPosts = useCallback(async (board: BoardKey, page = 1) => {
    setLoading(true)
    try {
      const res = await api.get<ListResponse>(
        `/community/posts?board=${board}&page=${page}&limit=20`
      )
      setPosts((res as ListResponse).data)
      setMeta((res as ListResponse).meta)
    } catch {
      setPosts([])
      setMeta({ page: 1, limit: 20, total: 0 })
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchChatRooms = useCallback(async () => {
    setChatRoomsLoading(true)
    try {
      const res = await api.get<{ data: ChatRoom[] }>('/community/chat/rooms')
      setChatRooms(res.data ?? [])
    } catch {
      setChatRooms([])
    } finally {
      setChatRoomsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'chat') fetchChatRooms()
    else if (tab === 'discussion' || tab === 'learning') fetchPosts(tab)
  }, [tab, fetchPosts, fetchChatRooms])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    if (!formTitle.trim() || !formBody.trim()) {
      setSubmitError('제목과 내용을 입력해 주세요.')
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post<{ data: PostItem }>('/community/posts', {
        board: tab,
        title: formTitle.trim(),
        body: formBody.trim(),
      })
      setFormTitle('')
      setFormBody('')
      setShowForm(false)
      setPosts((prev) => [res.data, ...prev])
      setMeta((prev) => ({ ...prev, total: prev.total + 1 }))
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'error' in err && typeof (err as { error: { message?: string } }).error?.message === 'string'
          ? (err as { error: { message: string } }).error.message
          : '글 등록에 실패했습니다.'
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (s: string) => {
    const d = new Date(s)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}분 전`
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}시간 전`
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Community</h1>
        <p className="mt-1 text-slate-500">
          자유 토론과 창업 학습 공간입니다. 노코드·AI·SaaS·1인 빌더 주제를 나눌 수 있습니다.
        </p>
      </div>

      <div className="border-b border-slate-200">
        <div className="flex gap-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-t-lg border-b-2 px-4 py-3 text-sm font-medium transition-colors -mb-px ${
                tab === t.key
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab !== 'chat' && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {meta.total > 0 ? `총 ${meta.total}개의 글` : '등록된 글이 없습니다.'}
          </p>
          {user && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              글쓰기
            </button>
          )}
        </div>
      )}

      {tab === 'chat' && (
        <div className="mt-6">
          {chatRoomsLoading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-center">
              <p className="text-slate-500">채팅방 목록을 불러오는 중…</p>
            </div>
          ) : chatRooms.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-center">
              <p className="text-slate-600">채팅방이 없습니다.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {chatRooms.map((room) => (
                <li key={room.id}>
                  <Link
                    href={`/community/chat/${room.id}`}
                    className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-lg font-medium text-teal-700">
                      #
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{room.name}</p>
                      <p className="text-sm text-slate-500">대화하기</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showForm && user && tab !== 'chat' && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-xl border border-slate-200 bg-slate-50/50 p-6"
        >
          <h3 className="text-lg font-semibold text-slate-900">새 글 작성</h3>
          <div className="mt-4">
            <label htmlFor="post-title" className="block text-sm font-medium text-slate-700">
              제목
            </label>
            <input
              id="post-title"
              type="text"
              maxLength={200}
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="제목을 입력하세요"
            />
          </div>
          <div className="mt-4">
            <label htmlFor="post-body" className="block text-sm font-medium text-slate-700">
              내용
            </label>
            <textarea
              id="post-body"
              rows={5}
              maxLength={10000}
              value={formBody}
              onChange={(e) => setFormBody(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="내용을 입력하세요"
            />
          </div>
          {submitError && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {submitError}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {submitting ? '등록 중…' : '등록'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setFormTitle('')
                setFormBody('')
                setSubmitError(null)
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {tab !== 'chat' && (loading ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-center">
          <p className="text-slate-500">목록을 불러오는 중…</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-center">
          <p className="text-slate-600">
            {tab === 'discussion' ? '자유 토론' : '창업 학습'} 게시판에 아직 글이 없습니다.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {user ? '글쓰기 버튼으로 첫 글을 올려 보세요.' : '로그인 후 글을 작성할 수 있습니다.'}
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                href={`/community/posts/${post.id}`}
                className="block rounded-lg border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <h3 className="font-medium text-slate-900">{post.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{post.body}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <span>{post.user?.name ?? '알 수 없음'}</span>
                  <span>{formatDate(post.created_at)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ))}
    </div>
  )
}
