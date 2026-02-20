import { supabase } from '@/lib/supabase'
import { successResponse, errorResponse } from '@/lib/auth'

const LIMIT = 60

function vibeScore(verification: number, comments: number, updates: number, voteDelta: number): number {
  return Math.max(0, verification * 10 + comments * 2 + updates * 1 + voteDelta * 2)
}

// GET /api/v1/rankings — 랭킹 (이번 주 Top / 댓글순 / Vibe Score)
export async function GET() {
  const { data: rows, error } = await supabase
    .from('projects')
    .select(
      `
      id, title, short_description, category, status, thumbnail_url, service_url,
      created_at, updated_at,
      user:users!user_id (id, name, avatar_url),
      funding:fundings!project_id (goal_amount, deadline, min_pledge_amount)
    `
    )
    .eq('approval_status', 'approved')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(LIMIT)

  if (error) {
    return errorResponse(500, 'INTERNAL_ERROR', '랭킹 조회 실패')
  }

  const list = rows ?? []
  if (list.length === 0) {
    return successResponse({ this_week: [], most_comments: [], top_vibe: [] })
  }

  const projectIds = list.map((p: { id: string }) => p.id)

  const [commentsRes, updatesRes, verificationRes, pledgesRes, votesRes] = await Promise.all([
    supabase.from('comments').select('project_id').in('project_id', projectIds),
    supabase.from('updates').select('project_id, created_at').in('project_id', projectIds),
    Promise.resolve(
      supabase.from('verification_responses').select('project_id').in('project_id', projectIds)
    ).then((r) => r).catch(() => ({ data: [] as { project_id: string }[] })),
    supabase.from('pledges').select('project_id, amount').in('project_id', projectIds).eq('status', 'completed'),
    supabase.from('project_votes').select('project_id, vote').in('project_id', projectIds),
  ])
  const progressByProject: Record<string, { current_amount: number; backer_count: number }> = {}
  for (const row of pledgesRes.data ?? []) {
    const pid = row.project_id
    if (!progressByProject[pid]) progressByProject[pid] = { current_amount: 0, backer_count: 0 }
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
  const verificationData: { project_id: string }[] = (verificationRes as { data?: { project_id: string }[] }).data ?? []
  const verificationCountByProject: Record<string, number> = {}
  for (const v of verificationData) {
    verificationCountByProject[v.project_id] = (verificationCountByProject[v.project_id] ?? 0) + 1
  }

  const voteDeltaByProject: Record<string, number> = {}
  for (const row of votesRes.data ?? []) {
    const pid = row.project_id
    voteDeltaByProject[pid] = (voteDeltaByProject[pid] ?? 0) + (row.vote === 'up' ? 1 : -1)
  }

  const withScores = list.map((p: Record<string, unknown>) => {
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
      vibe_score: vibeScore(verification, comments, updates, voteDeltaByProject[pid] ?? 0),
      verification_count: verification,
    }
  })

  const this_week = [...withScores].sort(
    (a, b) => new Date((b as { created_at?: string }).created_at ?? 0).getTime() - new Date((a as { created_at?: string }).created_at ?? 0).getTime()
  ).slice(0, 12)

  const most_comments = [...withScores].sort(
    (a, b) => (b.comments_count as number) - (a.comments_count as number)
  ).slice(0, 12)

  const top_vibe = [...withScores].sort(
    (a, b) => (b.vibe_score as number) - (a.vibe_score as number)
  ).slice(0, 12)

  return successResponse({ this_week, most_comments, top_vibe })
}
