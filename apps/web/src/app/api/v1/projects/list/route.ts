import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { errorResponse, paginatedResponse } from '@/lib/auth'
import { parseBody } from '@/lib/validate'

const listSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  status: z.string().optional(),
  sort: z.enum(['created_at', 'deadline', 'comments_count', 'vibe_score']).default('created_at'),
  search: z.string().optional(),
})

const POOL_MAX = 100

// POST /api/v1/projects/list — 프로젝트 목록 (body 기반)
export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, listSchema)
  if (parsed.error) return parsed.error

  const page = parsed.data.page ?? 1
  const limit = parsed.data.limit ?? 20
  const sort = parsed.data.sort ?? 'created_at'
  const { category, status, search } = parsed.data
  const offset = (page - 1) * limit
  const useMemorySort = sort === 'comments_count' || sort === 'vibe_score'

  let query = supabase
    .from('projects')
    .select(
      `
      id, title, short_description, category, status, thumbnail_url, service_url,
      created_at,
      user:users!user_id (id, name, avatar_url),
      funding:fundings!project_id (goal_amount, deadline, min_pledge_amount)
    `,
      { count: useMemorySort ? undefined : 'exact' }
    )
    .eq('approval_status', 'approved')
    .is('deleted_at', null)

  if (category) query = query.eq('category', category)
  if (status) query = query.eq('status', status)
  const searchTrimmed = search?.trim()
  if (searchTrimmed) {
    const term = `%${searchTrimmed}%`
    query = query.or(`title.ilike.${term},short_description.ilike.${term}`)
  }

  if (useMemorySort) {
    query = query.order('created_at', { ascending: false }).range(0, POOL_MAX - 1)
  } else {
    query = query.order(sort, { ascending: false }).range(offset, offset + limit - 1)
  }

  const { data: rows, error, count } = await query

  if (error) return errorResponse(500, 'INTERNAL_ERROR', '프로젝트 목록 조회 실패')

  let list = rows ?? []
  if (list.length === 0) return paginatedResponse([], { page, limit, total: useMemorySort ? 0 : (count ?? 0) })

  const projectIds = list.map((p: { id: string }) => p.id)

  const [commentsRes, updatesRes, verificationRes, pledgesRes] = await Promise.all([
    supabase.from('comments').select('project_id').in('project_id', projectIds),
    supabase.from('updates').select('project_id, created_at').in('project_id', projectIds),
    Promise.resolve(supabase.from('verification_responses').select('project_id').in('project_id', projectIds)).then((r) => r).catch(() => ({ data: [] as { project_id: string }[] })),
    supabase.from('pledges').select('project_id, amount').in('project_id', projectIds).eq('status', 'completed'),
  ])
  const verificationData: { project_id: string }[] = (verificationRes as { data?: { project_id: string }[] }).data ?? []
  const progressByProject: Record<string, { current_amount: number; backer_count: number }> = {}
  for (const row of pledgesRes.data ?? []) {
    const pid = row.project_id
    if (!progressByProject[pid]) {
      progressByProject[pid] = { current_amount: 0, backer_count: 0 }
    }
    progressByProject[pid].current_amount += Number(row.amount ?? 0)
    progressByProject[pid].backer_count += 1
  }

  const commentCountByProject: Record<string, number> = {}
  for (const c of commentsRes.data ?? []) {
    commentCountByProject[c.project_id] = (commentCountByProject[c.project_id] ?? 0) + 1
  }
  const lastUpdateByProject: Record<string, string> = {}
  const updateCountByProject: Record<string, number> = {}
  for (const u of updatesRes.data ?? []) {
    updateCountByProject[u.project_id] = (updateCountByProject[u.project_id] ?? 0) + 1
    const cur = lastUpdateByProject[u.project_id]
    if (!cur || u.created_at > cur) lastUpdateByProject[u.project_id] = u.created_at
  }
  const verificationCountByProject: Record<string, number> = {}
  for (const v of verificationData) {
    verificationCountByProject[v.project_id] = (verificationCountByProject[v.project_id] ?? 0) + 1
  }

  function vibeScore(verification: number, comments: number, updates: number): number {
    return verification * 10 + comments * 2 + updates * 1
  }

  let data = list.map((p: Record<string, unknown>) => {
    const pid = p.id as string
    const comments = commentCountByProject[pid] ?? 0
    const updates = updateCountByProject[pid] ?? 0
    const verification = verificationCountByProject[pid] ?? 0
    const progress = progressByProject[pid]
    const rawFunding = p.funding as unknown
    const fundingRow = Array.isArray(rawFunding) ? rawFunding[0] : rawFunding
    const goal = Number((fundingRow as { goal_amount?: number } | null)?.goal_amount ?? 0)
    const deadline = (fundingRow as { deadline?: string } | null)?.deadline
    const current = progress?.current_amount ?? 0
    const backerCount = progress?.backer_count ?? 0
    const progressPercent = goal > 0 ? Math.round((current / goal) * 1000) / 10 : 0
    const daysLeft = deadline ? Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)) : 0
    const fundingMerged = fundingRow
      ? { ...(fundingRow as Record<string, unknown>), current_amount: current, progress_percent: progressPercent, days_left: daysLeft, backer_count: backerCount }
      : fundingRow
    return {
      ...p,
      funding: Array.isArray(rawFunding) ? [fundingMerged] : fundingMerged,
      comments_count: comments,
      last_update_at: lastUpdateByProject[pid] ?? p.updated_at ?? p.created_at,
      vibe_score: vibeScore(verification, comments, updates),
      verification_count: verification,
    }
  })

  let total = count ?? 0
  if (useMemorySort) {
    data = data.sort((a, b) => {
      if (sort === 'comments_count') return (b.comments_count as number) - (a.comments_count as number)
      return (b.vibe_score as number) - (a.vibe_score as number)
    })
    total = data.length
    data = data.slice(offset, offset + limit)
  }

  return paginatedResponse(data, { page, limit, total })
}
