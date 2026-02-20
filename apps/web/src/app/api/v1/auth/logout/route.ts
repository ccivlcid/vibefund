import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json(null, { status: 204 })
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })
  return response
}
