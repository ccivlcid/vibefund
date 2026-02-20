import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, successResponse, errorResponse, noContentResponse } from '@/lib/auth'
import { parseBody } from '@/lib/validate'
import { getProjectWithProgress, PROJECT_SELECT } from '../get-project'

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
