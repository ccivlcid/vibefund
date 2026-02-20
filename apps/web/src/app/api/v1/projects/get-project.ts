import { supabase } from '@/lib/supabase'

const PROJECT_SELECT = `
  id, title, short_description, description, service_url, category,
  status, approval_status, thumbnail_url, created_at, updated_at,
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

  const [commentsRes, updatesRes] = await Promise.all([
    supabase.from('comments').select('id, body, created_at, user:users!user_id (id, name, avatar_url)').eq('project_id', id).order('created_at', { ascending: false }).limit(50),
    supabase.from('updates').select('id, title, body, created_at').eq('project_id', id).order('created_at', { ascending: false }).limit(20),
  ])
  const comments = (commentsRes.data ?? []).map((c: { body: string; [k: string]: unknown }) => ({
    ...c,
    content: c.body,
  }))
  const updates = (updatesRes.data ?? []).map((u: { body: string; [k: string]: unknown }) => ({
    ...u,
    content: u.body,
  }))
  return { ...project, funding, comments, updates }
}

export { PROJECT_SELECT }
