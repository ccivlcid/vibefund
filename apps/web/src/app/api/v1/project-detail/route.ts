import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getProjectWithProgress } from '../projects/get-project'
import { successResponse, errorResponse } from '@/lib/auth'
import { parseBody } from '@/lib/validate'

const bodySchema = z.object({ id: z.string().uuid() })

// POST /api/v1/project-detail — 상세 조회 (ID를 body로 전달, URL에 키 노출 없음)
// projects/[id]와 경로 충돌 방지를 위해 projects 밖에 둠
export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, bodySchema)
  if (parsed.error) return parsed.error

  const data = await getProjectWithProgress(parsed.data.id)
  if (!data) return errorResponse(404, 'PROJECT_NOT_FOUND', '프로젝트를 찾을 수 없습니다.')
  return successResponse(data)
}
