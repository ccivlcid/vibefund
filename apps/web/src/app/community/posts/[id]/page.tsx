'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface PostUser {
  id: string
  name: string | null
  avatar_url: string | null
}

interface Post {
  id: string
  board: string
  title: string
  body: string
  created_at: string
  updated_at: string
  user: PostUser | null
}

interface CommentUser {
  id: string
  name: string | null
  avatar_url: string | null
}

interface Comment {
  id: string
  post_id: string
  parent_id: string | null
  body: string
  created_at: string
  updated_at: string
  user: CommentUser | null
}

interface CommentTreeItem {
  comment: Comment
  children: CommentTreeItem[]
}

function buildCommentTree(comments: Comment[]): CommentTreeItem[] {
  const byParent = new Map<string | null, Comment[]>()
  for (const c of comments) {
    const key = c.parent_id ?? null
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(c)
  }
  function build(parentKey: string | null): CommentTreeItem[] {
    const list = byParent.get(parentKey) ?? []
    return list.map((comment) => ({ comment, children: build(comment.id) }))
  }
  return build(null)
}

const BOARD_LABEL: Record<string, string> = {
  discussion: '자유 토론',
  learning: '창업 학습',
}

function formatDate(s: string) {
  const d = new Date(s)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}분 전`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}시간 전`
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function CommunityPostPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const id = typeof params?.id === 'string' ? params.id : ''

  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentBody, setCommentBody] = useState('')
  const [replyToId, setReplyToId] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [commenting, setCommenting] = useState(false)

  const fetchPost = useCallback(async () => {
    if (!id) return
    try {
      const res = await api.get<{ data: Post }>(`/community/posts/${id}`)
      setPost(res.data)
      setEditTitle(res.data.title)
      setEditBody(res.data.body)
    } catch {
      setError('글을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [id])

  const fetchComments = useCallback(async () => {
    if (!id) return
    setCommentsLoading(true)
    try {
      const res = await api.get<{ data: Comment[] }>(`/community/posts/${id}/comments`)
      setComments(res.data ?? [])
    } catch {
      setComments([])
    } finally {
      setCommentsLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setError('잘못된 경로입니다.')
      return
    }
    fetchPost()
  }, [id, fetchPost])

  useEffect(() => {
    if (id && post) fetchComments()
  }, [id, post, fetchComments])

  const isAuthor = !!user && !!post?.user && post.user.id === user.id

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || saving) return
    setSaving(true)
    try {
      const res = await api.patch<{ data: Post }>(`/community/posts/${id}`, { title: editTitle.trim(), body: editBody.trim() })
      setPost(res.data)
      setEditing(false)
    } catch {
      setError('수정에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id || deleting || !confirm('이 글을 삭제할까요?')) return
    setDeleting(true)
    try {
      await api.delete(`/community/posts/${id}`)
      router.push('/community')
    } catch {
      setError('삭제에 실패했습니다.')
      setDeleting(false)
    }
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !id || !commentBody.trim() || commenting) return
    setCommenting(true)
    try {
      const res = await api.post<{ data: Comment }>(`/community/posts/${id}/comments`, { body: commentBody.trim() })
      setComments((prev) => [...prev, res.data])
      setCommentBody('')
    } finally {
      setCommenting(false)
    }
  }

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !id || !replyToId || !replyBody.trim() || commenting) return
    setCommenting(true)
    try {
      const res = await api.post<{ data: Comment }>(`/community/posts/${id}/comments`, { body: replyBody.trim(), parent_id: replyToId })
      setComments((prev) => [...prev, res.data])
      setReplyBody('')
      setReplyToId(null)
    } finally {
      setCommenting(false)
    }
  }

  if (loading && !post) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-slate-500">글을 불러오는 중…</p>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-red-600">{error ?? '글을 찾을 수 없습니다.'}</p>
        <Link href="/community" className="mt-4 inline-block text-sm font-medium text-teal-600 hover:underline">
          목록으로
        </Link>
      </div>
    )
  }

  const boardLabel = BOARD_LABEL[post.board] ?? post.board
  const createdAt = new Date(post.created_at).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const commentTree = buildCommentTree(comments)

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/community" className="inline-block text-sm font-medium text-teal-600 hover:underline">
        Community 목록
      </Link>

      <article className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="rounded bg-slate-100 px-2 py-0.5">{boardLabel}</span>
            <span>{createdAt}</span>
          </div>
          {isAuthor && !editing && (
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                수정
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? '삭제 중…' : '삭제'}
              </Button>
            </div>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="제목"
              maxLength={200}
              className="w-full"
            />
            <Textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              placeholder="내용"
              rows={8}
              maxLength={10000}
              className="w-full"
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? '저장 중…' : '저장'}</Button>
              <Button type="button" variant="ghost" onClick={() => { setEditing(false); setEditTitle(post.title); setEditBody(post.body) }}>
                취소
              </Button>
            </div>
          </form>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-slate-900">{post.title}</h1>
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <span>{post.user?.name ?? '알 수 없음'}</span>
            </div>
            <div className="mt-6 whitespace-pre-wrap text-slate-700">{post.body}</div>
          </>
        )}
      </article>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">댓글 {comments.length}</h2>

        {user ? (
          <form onSubmit={handleCommentSubmit} className="mt-4 space-y-3">
            <Textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="댓글을 입력하세요"
              className="min-h-[120px] w-full resize-y text-base"
              rows={4}
              maxLength={1000}
            />
            <div className="flex justify-end">
              <Button type="submit" size="md" disabled={commenting || !commentBody.trim()}>
                등록
              </Button>
            </div>
          </form>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            <Link href="/auth/login" className="text-teal-600 hover:underline">로그인</Link>하면 댓글을 작성할 수 있습니다.
          </p>
        )}

        {commentsLoading ? (
          <p className="mt-4 text-sm text-slate-500">댓글을 불러오는 중…</p>
        ) : commentTree.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">댓글이 없습니다.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {commentTree.map((item) => (
              <CommentBlock
                key={item.comment.id}
                item={item}
                depth={0}
                user={user}
                replyToId={replyToId}
                setReplyToId={setReplyToId}
                replyBody={replyBody}
                setReplyBody={setReplyBody}
                handleReply={handleReplySubmit}
                commenting={commenting}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function CommentBlock({
  item,
  depth,
  user,
  replyToId,
  setReplyToId,
  replyBody,
  setReplyBody,
  handleReply,
  commenting,
}: {
  item: CommentTreeItem
  depth: number
  user: { id: string; name?: string } | null
  replyToId: string | null
  setReplyToId: (id: string | null) => void
  replyBody: string
  setReplyBody: (s: string) => void
  handleReply: (e: React.FormEvent) => void
  commenting: boolean
}) {
  const { comment, children } = item
  const isReply = depth > 0
  return (
    <li className={isReply ? 'ml-6 mt-2 border-l-2 border-slate-100 pl-4' : ''}>
      <div className="flex gap-2">
        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${isReply ? 'bg-slate-100 text-slate-600 text-xs' : 'bg-teal-100 text-teal-700 text-sm'} font-medium`}>
          {comment.user?.name?.[0] ?? '?'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={isReply ? 'text-xs font-medium text-slate-800' : 'text-sm font-semibold text-slate-900'}>
              {comment.user?.name ?? '알 수 없음'}
            </span>
            <span className="text-xs text-slate-400">{formatDate(comment.created_at)}</span>
            {user && (
              <button
                type="button"
                onClick={() => setReplyToId(replyToId === comment.id ? null : comment.id)}
                className="text-xs text-teal-600 hover:underline"
              >
                답글
              </button>
            )}
          </div>
          <p className="mt-0.5 text-sm text-slate-700 whitespace-pre-wrap">{comment.body}</p>
          {replyToId === comment.id && (
            <form onSubmit={handleReply} className="mt-2 space-y-2">
              <Textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="답글 입력..."
                className="min-h-[80px] w-full resize-y text-sm"
                rows={3}
                maxLength={1000}
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={commenting || !replyBody.trim()}>등록</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setReplyToId(null); setReplyBody('') }}>취소</Button>
              </div>
            </form>
          )}
          {children.length > 0 && (
            <ul className="mt-2 space-y-2">
              {children.map((child) => (
                <CommentBlock
                  key={child.comment.id}
                  item={child}
                  depth={depth + 1}
                  user={user}
                  replyToId={replyToId}
                  setReplyToId={setReplyToId}
                  replyBody={replyBody}
                  setReplyBody={setReplyBody}
                  handleReply={handleReply}
                  commenting={commenting}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  )
}
