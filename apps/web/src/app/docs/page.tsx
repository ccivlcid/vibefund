'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import 'swagger-ui-react/swagger-ui.css'

// Dynamically import to avoid SSR issues with swagger-ui-react
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false })

export default function DocsPage() {
  const [spec, setSpec] = useState<object | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/v1/openapi.json')
      .then((r) => r.json())
      .then(setSpec)
      .catch(() => setError(true))
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Page header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-lg font-bold text-gray-900">VibeFund API Docs</h1>
        <p className="text-xs text-gray-400">
          OpenAPI 3.0 &middot;{' '}
          <a
            href="/api/v1/openapi.json"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-700"
          >
            openapi.json 다운로드
          </a>
        </p>
      </div>

      {/* Swagger UI */}
      <div id="swagger-ui-wrapper">
        {error ? (
          <div className="flex min-h-64 items-center justify-center text-sm text-red-500">
            API 명세를 불러오지 못했습니다.
          </div>
        ) : !spec ? (
          <div className="flex min-h-64 items-center justify-center text-sm text-gray-400">
            불러오는 중...
          </div>
        ) : (
          <SwaggerUI
            spec={spec}
            docExpansion="list"
            defaultModelsExpandDepth={1}
            displayRequestDuration
            filter
          />
        )}
      </div>
    </div>
  )
}
