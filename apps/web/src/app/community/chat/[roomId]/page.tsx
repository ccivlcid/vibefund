'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'

interface ChatUser {
  id: string
  name: string | null
  avatar_url: string | null
}

interface ChatMessage {
  id: string
  room_id: string
  body: string
  created_at: string
  user: ChatUser | null
}

interface Room {
  id: string
  key: string
  name: string
  created_at: string
}

const POLL_INTERVAL_MS = 3000

export default function CommunityChatRoomPage() {
  const params = useParams()
  const roomId = typeof params?.roomId === 'string' ? params.roomId : ''
  const { user } = useAuth()

  const [room, setRoom] = useState<Room | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const fetchRoom = useCallback(async () => {
    if (!roomId) return
    try {
      const res = await api.get<{ data: Room }>(`/community/chat/rooms/${roomId}`)
      setRoom(res.data)
    } catch {
      setRoom(null)
      setError('채팅방을 찾을 수 없습니다.')
    }
  }, [roomId])

  const fetchMessages = useCallback(async () => {
    if (!roomId) return
    try {
      const res = await api.get<{ data: { messages: ChatMessage[] } }>(
        `/community/chat/rooms/${roomId}/messages?limit=100`
      )
      setMessages(res.data.messages ?? [])
    } catch {
      setMessages([])
    }
  }, [roomId])

  useEffect(() => {
    if (!roomId) {
      setLoading(false)
      setError('잘못된 경로입니다.')
      return
    }
    setLoading(true)
    setError(null)
    Promise.all([fetchRoom(), fetchMessages()]).finally(() => setLoading(false))
  }, [roomId, fetchRoom, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!roomId || !user) return
    const t = setInterval(fetchMessages, POLL_INTERVAL_MS)
    return () => clearInterval(t)
  }, [roomId, user, fetchMessages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !roomId || !input.trim() || sending) return
    setSending(true)
    try {
      const res = await api.post<{ data: ChatMessage }>(`/community/chat/rooms/${roomId}/messages`, {
        body: input.trim(),
      })
      setMessages((prev) => [...prev, res.data])
      setInput('')
    } catch {
      setError('메시지 전송에 실패했습니다.')
    } finally {
      setSending(false)
    }
  }

  const formatTime = (s: string) => {
    const d = new Date(s)
    const now = new Date()
    const sameDay = d.toDateString() === now.toDateString()
    if (sameDay) return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (loading && !room) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-slate-500">채팅방을 불러오는 중…</p>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-red-600">{error ?? '채팅방을 찾을 수 없습니다.'}</p>
        <Link href="/community" className="mt-4 inline-block text-sm font-medium text-teal-600 hover:underline">
          Community로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 py-6" style={{ height: 'calc(100vh - 8rem)' }}>
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <Link
          href="/community"
          className="text-slate-500 hover:text-slate-900"
          aria-label="목록으로"
        >
          <span className="text-lg font-medium">←</span>
        </Link>
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700 font-medium">
          #
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{room.name}</h1>
          <p className="text-xs text-slate-500">실시간 대화</p>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-4"
      >
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">아직 메시지가 없습니다. 첫 메시지를 보내 보세요.</p>
        ) : (
          <ul className="space-y-3">
            {messages.map((msg) => {
              const isMe = user?.id === (msg.user?.id ?? null)
              return (
                <li
                  key={msg.id}
                  className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  {!isMe && (
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                      {msg.user?.name?.[0] ?? '?'}
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      isMe ? 'bg-teal-600 text-white' : 'bg-white text-slate-900 shadow-sm border border-slate-100'
                    }`}
                  >
                    {!isMe && (
                      <p className="text-xs font-medium text-slate-500 mb-0.5">{msg.user?.name ?? '알 수 없음'}</p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                    <p className={`mt-1 text-xs ${isMe ? 'text-teal-200' : 'text-slate-400'}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <div ref={messagesEndRef} />
      </div>

      {user ? (
        <form onSubmit={handleSend} className="mt-4 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지를 입력하세요..."
            maxLength={2000}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            전송
          </button>
        </form>
      ) : (
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/auth/login" className="text-teal-600 hover:underline">로그인</Link>하면 메시지를 보낼 수 있습니다.
        </p>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
