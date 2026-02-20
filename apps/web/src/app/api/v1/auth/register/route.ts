import { NextRequest } from 'next/server'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { signToken } from '@/lib/jwt'
import { successResponse, errorResponse } from '@/lib/auth'
import { parseBody } from '@/lib/validate'

const registerSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z
    .string()
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다.')
    .regex(/[a-zA-Z]/, '영문자를 포함해야 합니다.')
    .regex(/[0-9]/, '숫자를 포함해야 합니다.'),
  name: z.string().min(1).max(50).optional(),
})

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, registerSchema)
  if (parsed.error) return parsed.error

  const { email, password, name } = parsed.data

  // 이메일 중복 확인
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existing) {
    return errorResponse(409, 'EMAIL_ALREADY_EXISTS', '이미 사용 중인 이메일입니다.')
  }

  const passwordHash = await hash(password, 12)
  const displayName = name ?? email.split('@')[0]

  const { data: user, error } = await supabase
    .from('users')
    .insert({
      email,
      password_hash: passwordHash,
      name: displayName,
      role: 'user',
      provider: 'email',
    })
    .select('id, email, name, role, created_at')
    .single()

  if (error || !user) {
    return errorResponse(500, 'INTERNAL_ERROR', '회원가입 처리 중 오류가 발생했습니다.')
  }

  const token = await signToken({ sub: user.id, email: user.email, role: user.role })

  const response = successResponse({ user, token }, 201)
  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24h
    path: '/',
  })
  return response
}
