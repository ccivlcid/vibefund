import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, successResponse, errorResponse, noContentResponse } from '@/lib/auth'
import { parseBody } from '@/lib/validate'

const PROJECT_SELECT = `
  id, title, short_description, description, service_url, category,
  status, approval_status, thumbnail_url, created_at, updated_at,
  user:users!user_id (id, name, avatar_url),
  funding:fundings!project_id (
    id, goal_amount, deadline, min_pledge_amount, created_at
  ),
  rewards (id, name, description, amount, type)
`

async function getProjectWithProgress(id: string) {
  const { data: project, error } = await supabase
    .from('projects')
    .select(PROJECT_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !project) return null

  // 진행률·후원자 수 반영
  const [progressRes, countRes] = await Promise.all([
    supabase.from('funding_progress').select('current_amount, progress_percent, days_left').eq('project_id', id).single(),
    supabase.from('pledges').select('id', { count: 'exact', head: true }).eq('project_id', id).eq('status', 'completed'),
  ])
  const funding = project.funding as Record<string, unknown> | null
  if (funding && progressRes.data) {
    funding.current_amount = progressRes.data.current_amount ?? 0
    funding.progress_percent = progressRes.data.progress_percent ?? 0
    funding.days_left = progressRes.data.days_left ?? 0
  }
  if (funding) funding.backer_count = countRes.count ?? 0

  // comments, updates 별도 조회 (프로젝트 상세용)
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
  return { ...project, comments, updates }
}

// GET /api/v1/projects/:id
export async function GET(_req: NextRequest, { params }: { params: Promise<Record<string, string>> }) {
  const { id } = await params
  const data = await getProjectWithProgress(id)
  if (!data) return errorResponse(404, 'PROJECT_NOT_FOUND', '프로젝트를 찾을 수 없습니다.')
  return successResponse(data)
}

// POST /api/v1/projects/:id — 상세 조회 (body 없음, POST 방식)
export async function POST(_req: NextRequest, { params }: { params: Promise<Record<string, string>> }) {
  const { id } = await params
  const data = await getProjectWithProgress(id)
  if (!data) return errorResponse(404, 'PROJECT_NOT_FOUND', '프로젝트를 찾을 수 없습니다.')
  return successResponse(data)
}

// PATCH /api/v1/projects/:id
export const PATCH = withAuth(async (req: AuthedRequest, { params }) => {
  const { id } = await params

  const { data: existing } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!existing) return errorResponse(404, 'PROJECT_NOT_FOUND', '프로젝트를 찾을 수 없습니다.')
  if (existing.user_id !== req.user.sub && req.user.role !== 'admin') {
    return errorResponse(403, 'FORBIDDEN', '수정 권한이 없습니다.')
  }

  const updateSchema = z.object({
    title: z.string().min(1).max(100).optional(),
    short_description: z.string().min(1).max(200).optional(),
    service_url: z.string().url().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    status: z.enum(['Prototype', 'Beta', 'Live']).optional(),
    thumbnail_url: z.string().url().optional(),
  })

  const parsed = await parseBody(req, updateSchema)
  if (parsed.error) return parsed.error

  const { data, error } = await supabase
    .from('projects')
    .update(parsed.data)
    .eq('id', id)
    .select(PROJECT_SELECT)
    .single()

  if (error || !data) return errorResponse(500, 'INTERNAL_ERROR', '프로젝트 수정 실패')

  return successResponse(data)
})

// DELETE /api/v1/projects/:id (소프트 삭제)
export const DELETE = withAuth(async (req: AuthedRequest, { params }) => {
  const { id } = await params

  const { data: existing } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!existing) return errorResponse(404, 'PROJECT_NOT_FOUND', '프로젝트를 찾을 수 없습니다.')
  if (existing.user_id !== req.user.sub && req.user.role !== 'admin') {
    return errorResponse(403, 'FORBIDDEN', '삭제 권한이 없습니다.')
  }

  const { error } = await supabase
    .from('projects')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return errorResponse(500, 'INTERNAL_ERROR', '프로젝트 삭제 실패')

  return noContentResponse()
})
