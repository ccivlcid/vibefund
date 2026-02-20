import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAdmin, errorResponse, paginatedResponse } from '@/lib/auth'
import { getPaginationParams } from '@/lib/validate'
import { parseBody } from '@/lib/validate'

const listSchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  role: z.string().optional(),
  search: z.string().optional(),
})

async function listUsers(body: { page?: number; limit?: number; role?: string; search?: string }) {
  const page = body.page ?? 1
  const limit = body.limit ?? 20
  const offset = (page - 1) * limit
  let query = supabase
    .from('users')
    .select('id, email, name, role, provider, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (body.search) query = query.or(`email.ilike.%${body.search}%,name.ilike.%${body.search}%`)
  if (body.role) query = query.eq('role', body.role)
  const { data, error, count } = await query
  if (error) return null
  return paginatedResponse(data ?? [], { page, limit, total: count ?? 0 })
}

// GET /api/v1/admin/users
export const GET = withAdmin(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const { page, limit } = getPaginationParams(searchParams)
  const res = await listUsers({
    page,
    limit,
    role: searchParams.get('role') ?? undefined,
    search: searchParams.get('search') ?? undefined,
  })
  if (!res) return errorResponse(500, 'INTERNAL_ERROR', '회원 목록 조회 실패')
  return res
})

// POST /api/v1/admin/users
export const POST = withAdmin(async (req: NextRequest) => {
  const parsed = await parseBody(req, listSchema)
  if (parsed.error) return parsed.error
  const res = await listUsers(parsed.data)
  if (!res) return errorResponse(500, 'INTERNAL_ERROR', '회원 목록 조회 실패')
  return res
})
