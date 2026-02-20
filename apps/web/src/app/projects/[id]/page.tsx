'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// URL에 프로젝트 ID 노출 방지: /projects/[id] 접근 시 sessionStorage에 id 저장 후 /projects/view로 리다이렉트
const VIEW_PROJECT_ID_KEY = 'vibefund_view_project_id'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  useEffect(() => {
    if (id) {
      sessionStorage.setItem(VIEW_PROJECT_ID_KEY, id)
      router.replace('/projects/view')
    } else {
      router.replace('/')
    }
  }, [id, router])

  return null
}
