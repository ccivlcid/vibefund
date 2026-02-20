import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, successResponse, errorResponse } from '@/lib/auth'
import { parseBody } from '@/lib/validate'

const bodySchema = z.object({
  amount: z.coerce.number().int().min(1000, '최소 1,000원부터 충전 가능합니다.').max(10_000_000, '1회 최대 1,000만 원까지 가능합니다.'),
})

/**
 * POST /api/v1/users/me/charge
 * 프로토타입용 가상 충전. 실제 결제 없이 잔액만 증가시킵니다.
 */
export const POST = withAuth(async (req: AuthedRequest, _ctx) => {
  const parsed = await parseBody(req, bodySchema)
  if (parsed.error) return parsed.error

  const amount = parsed.data.amount

  const { data: row, error: fetchErr } = await supabase
    .from('users')
    .select('balance')
    .eq('id', req.user.sub)
    .single()

  if (fetchErr || row == null) return errorResponse(500, 'INTERNAL_ERROR', '잔액 조회에 실패했습니다.')

  const current = Number(row.balance ?? 0)
  const nextBalance = current + amount

  const { data: updated, error: updateErr } = await supabase
    .from('users')
    .update({ balance: nextBalance })
    .eq('id', req.user.sub)
    .select('balance')
    .single()

  if (updateErr || !updated) return errorResponse(500, 'INTERNAL_ERROR', '충전 처리에 실패했습니다.')

  return successResponse({ balance: Number(updated.balance), charged: amount }, 200)
})
