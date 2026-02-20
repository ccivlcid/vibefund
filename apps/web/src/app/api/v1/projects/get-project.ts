import { supabase } from '@/lib/supabase'

const PROJECT_SELECT = `
  id, title, short_description, description, service_url, category,
  status, approval_status, thumbnail_url, feedback_preference, created_at, updated_at,
  user:users!user_id (id, name, avatar_url),
  funding:fundings!project_id (
    id, goal_amount, deadline, min_pledge_amount, created_at
  ),
  rewards (id, name, description, amount, type)
`

export async function getProjectWithProgress(id: string) {
  const { data: project, error } = await supabase
    .from('projects')
    .select(PROJECT_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !project) return null

  const [progressRes, countRes] = await Promise.all([
    supabase.from('funding_progress').select('current_amount, progress_percent, days_left').eq('project_id', id).single(),
    supabase.from('pledges').select('id', { count: 'exact', head: true }).eq('project_id', id).eq('status', 'completed'),
  ])
  const rawFunding = project.funding as unknown
  const fundingRow = Array.isArray(rawFunding) ? rawFunding[0] : rawFunding
  const funding: Record<string, unknown> | null = fundingRow ? { ...(fundingRow as Record<string, unknown>) } : null
  if (funding && progressRes.data) {
    funding.current_amount = progressRes.data.current_amount ?? 0
    funding.progress_percent = progressRes.data.progress_percent ?? 0
    funding.days_left = progressRes.data.days_left ?? 0
  }
  if (funding) funding.backer_count = countRes.count ?? 0

  const [commentsRes, updatesRes, verificationRes, votesRes] = await Promise.all([
    supabase.from('comments').select('id, body, parent_id, created_at, user:users!user_id (id, name, avatar_url)').eq('project_id', id).order('created_at', { ascending: true }).limit(200),
    supabase.from('updates').select('id, title, body, created_at').eq('project_id', id).order('created_at', { ascending: false }).limit(20),
    supabase.from('verification_responses').select('id', { count: 'exact', head: true }).eq('project_id', id),
    supabase.from('project_votes').select('vote').eq('project_id', id),
  ])
  const comments = (commentsRes.data ?? []).map((c: { body: string; parent_id?: string | null; [k: string]: unknown }) => ({
    ...c,
    content: c.body,
  }))
  const updates = (updatesRes.data ?? []).map((u: { body: string; [k: string]: unknown }) => ({
    ...u,
    content: u.body,
  }))
  const verificationCount = (verificationRes as { count?: number }).count ?? 0
  const votesList = (votesRes.data ?? []) as { vote: string }[]
  const vote_up_count = votesList.filter((v) => v.vote === 'up').length
  const vote_down_count = votesList.filter((v) => v.vote === 'down').length
  const voteDelta = vote_up_count - vote_down_count
  const vibeScore = Math.max(0, verificationCount * 10 + comments.length * 2 + updates.length * 1 + voteDelta * 2)
  const lastUpdateAt = updates.length > 0 ? (updates[0] as { created_at?: string }).created_at : (project.updated_at ?? project.created_at)
  return {
    ...project,
    funding,
    comments,
    updates,
    vibe_score: vibeScore,
    verification_count: verificationCount,
    last_update_at: lastUpdateAt,
    vote_up_count,
    vote_down_count,
  }
}

export { PROJECT_SELECT }
