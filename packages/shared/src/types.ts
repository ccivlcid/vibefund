// ─── 공통 타입 정의 ───────────────────────────────────────────────

export type UserRole = 'user' | 'admin'
export type ProjectStatus = 'Prototype' | 'Beta' | 'Live'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'hidden'
export type RewardType = 'beta' | 'lifetime' | 'subscription_discount'
export type PledgeStatus = 'pending' | 'completed' | 'refunded'

export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  bio?: string
  provider: 'email' | 'google'
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  user_id: string
  title: string
  short_description: string
  description?: string
  service_url: string
  category?: string
  status: ProjectStatus
  approval_status: ApprovalStatus
  thumbnail_url?: string
  deleted_at?: string
  created_at: string
  updated_at: string
}

export interface Funding {
  id: string
  project_id: string
  goal_amount: number
  deadline: string
  min_pledge_amount: number
  created_at: string
  updated_at: string
}

export interface Reward {
  id: string
  project_id: string
  name: string
  description: string
  amount: number
  type: RewardType
  created_at: string
  updated_at: string
}

export interface Pledge {
  id: string
  project_id: string
  user_id: string
  amount: number
  reward_id?: string
  stripe_payment_id?: string
  status: PledgeStatus
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  project_id: string
  user_id: string
  parent_id?: string
  body: string
  created_at: string
  updated_at: string
}

export interface Update {
  id: string
  project_id: string
  user_id: string
  title: string
  body: string
  created_at: string
  updated_at: string
}

// ─── API 응답 공통 타입 ──────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T
}

export interface ApiPaginated<T> {
  data: T[]
  meta: { page: number; limit: number; total: number }
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}
