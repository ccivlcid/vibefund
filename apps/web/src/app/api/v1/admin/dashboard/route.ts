import { supabase } from '@/lib/supabase'
import { withAdmin, successResponse } from '@/lib/auth'

async function getDashboardStats() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const [
    { count: totalUsers },
    { count: totalProjects },
    { count: pendingApproval },
    { count: newUsersThisWeek },
    { count: newProjectsThisWeek },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending').is('deleted_at', null),
    supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', oneWeekAgo),
    supabase.from('projects').select('*', { count: 'exact', head: true }).gte('created_at', oneWeekAgo).is('deleted_at', null),
  ])
  return {
    total_users: totalUsers ?? 0,
    total_projects: totalProjects ?? 0,
    pending_approval: pendingApproval ?? 0,
    new_users_this_week: newUsersThisWeek ?? 0,
    new_projects_this_week: newProjectsThisWeek ?? 0,
  }
}

// GET /api/v1/admin/dashboard
export const GET = withAdmin(async () => successResponse(await getDashboardStats()))

// POST /api/v1/admin/dashboard
export const POST = withAdmin(async () => successResponse(await getDashboardStats()))
