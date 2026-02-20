import { NextRequest } from 'next/server'
import { compare } from 'bcryptjs'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { signToken } from '@/lib/jwt'
import { successResponse, errorResponse } from '@/lib/auth'
import { parseBody } from '@/lib/validate'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, loginSchema)
  if (parsed.error) return parsed.error

  const { email, password } = parsed.data

  const { data: user } = await supabase
    .from('users')
    .select('id, email, name, role, password_hash')
    .eq('email', email)
    .single()

  // 이메일/비밀번호 오류를 동일한 메시지로 반환 (브루트포스 방어)
  if (!user) {
    return errorResponse(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다.')
  }

  const valid = await compare(password, user.password_hash)
  if (!valid) {
    return errorResponse(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다.')
  }

  const token = await signToken({ sub: user.id, email: user.email, role: user.role })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash: _pw, ...safeUser } = user

  const response = successResponse({ user: safeUser, token })
  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24,
    path: '/',
  })
  return response
}
