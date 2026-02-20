import { NextResponse } from 'next/server'
import { openapiSpec } from '@/lib/openapi'

// GET /api/v1/openapi.json
export const GET = () => {
  return NextResponse.json(openapiSpec, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
