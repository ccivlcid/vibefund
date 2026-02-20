import { supabase } from '@/lib/supabase'
import { withAuth, AuthedRequest, successResponse, errorResponse } from '@/lib/auth'

const BUCKET = 'thumbnails'
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)
}

// POST /api/v1/upload/thumbnail — 썸네일 이미지 파일 업로드 (로그인 필요)
export const POST = withAuth(async (req: AuthedRequest) => {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return errorResponse(400, 'INVALID_BODY', 'multipart/form-data가 필요합니다.')
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return errorResponse(400, 'MISSING_FILE', 'file 필드에 이미지 파일을 선택해 주세요.')
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return errorResponse(400, 'INVALID_TYPE', '허용 형식: JPEG, PNG, GIF, WebP')
  }
  if (file.size > MAX_SIZE_BYTES) {
    return errorResponse(400, 'FILE_TOO_LARGE', '파일 크기는 5MB 이하여야 합니다.')
  }

  const userId = req.user.sub
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ''))
  const path = `${userId}/${Date.now()}-${safeName}.${ext}`

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true })

  if (uploadError) {
    // 버킷이 없으면 404 비슷한 에러가 옴 → 사용자에게 Dashboard에서 버킷 생성 안내
    if (uploadError.message?.includes('Bucket') || uploadError.message?.includes('not found')) {
      return errorResponse(503, 'STORAGE_NOT_READY', '썸네일 저장소를 사용할 수 없습니다. thumbnails 버킷을 Supabase Dashboard에서 생성해 주세요.')
    }
    return errorResponse(500, 'UPLOAD_FAILED', uploadError.message || '업로드 실패')
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path)
  return successResponse({ url: urlData.publicUrl })
})
