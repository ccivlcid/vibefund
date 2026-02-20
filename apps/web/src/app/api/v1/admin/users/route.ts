import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { withAdmin, errorResponse, paginatedResponse } from '@/lib/auth'
import { getPaginationParams } from '@/lib/validate'

// GET /api/v1/admin/users
export const GET = withAdmin(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const { page, limit, offset } = getPaginationParams(searchParams)
  const search = searchParams.get('search')
  const role = searchParams.get('role')

  let query = supabase
    .from('users')
    .select('id, email, name, role, provider, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`)
  if (role)   query = query.eq('role', role)

  const { data, error, count } = await query

  if (error) return errorResponse(500, 'INTERNAL_ERROR', '회원 목록 조회 실패')

  return paginatedResponse(data ?? [], { page, limit, total: count ?? 0 })
})
