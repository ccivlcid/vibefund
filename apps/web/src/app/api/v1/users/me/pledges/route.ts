import { withAuth, AuthedRequest, paginatedResponse } from '@/lib/auth'
import { getPaginationParams } from '@/lib/validate'

// GET /api/v1/users/me/pledges
// ⚠️ 결제 도입 후 활성화 — 현재 빈 배열 반환
export const GET = withAuth(async (req: AuthedRequest) => {
  const { page, limit } = getPaginationParams(new URL(req.url).searchParams)

  return paginatedResponse([], { page, limit, total: 0 })
})
