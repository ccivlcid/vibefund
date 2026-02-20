import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, successResponse, errorResponse, paginatedResponse } from '@/lib/auth'
import { parseBody, getPaginationParams } from '@/lib/validate'

const createSchema = z.object({
  title: z.string().min(1).max(100),
  short_description: z.string().min(1).max(200),
  service_url: z.string().url('유효한 URL 형식이 아닙니다.'),
  description: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['Prototype', 'Beta', 'Live']).default('Prototype'),
  thumbnail_url: z.string().url().optional(),
  feedback_preference: z.enum(['validation_focus', 'comments_focus', 'both']).optional(),
})

// GET /api/v1/projects — 공개 프로젝트 목록
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const { page, limit, offset } = getPaginationParams(searchParams)
  const category = searchParams.get('category')
  const status = searchParams.get('status')

  let query = supabase
    .from('projects')
    .select(`
      id, title, short_description, category, status, thumbnail_url, service_url,
      created_at,
      user:users!user_id (id, name, avatar_url),
      funding:fundings!project_id (goal_amount, deadline, min_pledge_amount)
    `, { count: 'exact' })
    .eq('approval_status', 'approved')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (category) query = query.eq('category', category)
  if (status)   query = query.eq('status', status)

  const { data, error, count } = await query

  if (error) return errorResponse(500, 'INTERNAL_ERROR', '프로젝트 목록 조회 실패')

  return paginatedResponse(data ?? [], { page, limit, total: count ?? 0 })
}

// POST /api/v1/projects — 프로젝트 생성 (로그인 필요)
export const POST = withAuth(async (req: AuthedRequest) => {
  const parsed = await parseBody(req, createSchema)
  if (parsed.error) return parsed.error

  const { data: project, error } = await supabase
    .from('projects')
    .insert({ ...parsed.data, user_id: req.user.sub, approval_status: 'pending' })
    .select(`
      id, title, short_description, description, service_url, category,
      status, approval_status, thumbnail_url, created_at, updated_at,
      user:users!user_id (id, name, avatar_url)
    `)
    .single()

  if (error || !project) return errorResponse(500, 'INTERNAL_ERROR', '프로젝트 생성 실패')

  return successResponse(project, 201)
})
