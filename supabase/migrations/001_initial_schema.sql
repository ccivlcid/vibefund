-- VibeFund 초기 스키마 (PRD v2.0 반영)
-- 마이그레이션: 001_initial_schema.sql
-- 적용: Supabase SQL 에디터 또는 supabase db push
--
-- [기존 DB에 001 이미 적용된 경우]
-- 아래 "PRD v2.0 추가 테이블" 블록만 복사해 SQL 에디터에서 실행하세요.
-- funding_progress 뷰에 backer_count가 없다면, 해당 뷰 정의(backer_count 포함)도 별도 실행 권장.

-- ── 확장 ──────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ── ENUM 타입 ─────────────────────────────────────────────────────
create type user_role         as enum ('user', 'admin');
create type project_status    as enum ('Prototype', 'Beta', 'Live');
create type approval_status   as enum ('pending', 'approved', 'rejected', 'hidden');
create type reward_type       as enum ('beta', 'lifetime', 'subscription_discount');
create type pledge_status     as enum ('pending', 'completed', 'refunded');

-- ── 1. users ──────────────────────────────────────────────────────
create table users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text,                          -- OAuth 사용자는 null 허용
  name          text not null,
  avatar_url    text,
  bio           text check (char_length(bio) <= 200),
  provider      text not null default 'email'  -- 'email' | 'google'
                  check (provider in ('email', 'google')),
  role          user_role not null default 'user',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_users_email  on users (email);
create index idx_users_role   on users (role);

-- ── 2. projects ───────────────────────────────────────────────────
create table projects (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users (id) on delete cascade,
  title             text not null check (char_length(title) <= 100),
  short_description text not null check (char_length(short_description) <= 200),
  description       text,
  service_url       text not null,
  category          text,
  thumbnail_url     text,
  status            project_status  not null default 'Prototype',
  approval_status   approval_status not null default 'pending',
  rejection_reason  text,
  deleted_at        timestamptz,               -- 소프트 삭제
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_projects_user_id        on projects (user_id);
create index idx_projects_status         on projects (status);
create index idx_projects_approval       on projects (approval_status);
create index idx_projects_category       on projects (category);
create index idx_projects_created_at     on projects (created_at desc);
create index idx_projects_deleted_at     on projects (deleted_at) where deleted_at is null;

-- ── 3. fundings ───────────────────────────────────────────────────
create table fundings (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null unique references projects (id) on delete cascade,
  goal_amount       bigint not null check (goal_amount >= 100000),
  deadline          date   not null,
  min_pledge_amount bigint not null default 1000 check (min_pledge_amount >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_fundings_project_id on fundings (project_id);
create index idx_fundings_deadline   on fundings (deadline);

-- ── 4. rewards ────────────────────────────────────────────────────
create table rewards (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects (id) on delete cascade,
  name        text not null check (char_length(name) <= 100),
  description text not null,
  amount      bigint not null check (amount >= 0),
  type        reward_type not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_rewards_project_id on rewards (project_id);

-- ── 5. pledges (결제 도입 후 사용) ───────────────────────────────
create table pledges (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references projects (id) on delete cascade,
  user_id           uuid not null references users (id) on delete cascade,
  reward_id         uuid references rewards (id) on delete set null,
  amount            bigint not null check (amount > 0),
  stripe_payment_id text,                      -- 결제 도입 후 사용
  status            pledge_status not null default 'pending',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_pledges_project_id on pledges (project_id);
create index idx_pledges_user_id    on pledges (user_id);
create index idx_pledges_created_at on pledges (created_at desc);

-- ── 6. comments ───────────────────────────────────────────────────
create table comments (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects (id) on delete cascade,
  user_id     uuid not null references users (id) on delete cascade,
  parent_id   uuid references comments (id) on delete cascade,   -- 대댓글
  body        text not null check (char_length(body) between 1 and 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_comments_project_id on comments (project_id);
create index idx_comments_parent_id  on comments (parent_id);
create index idx_comments_created_at on comments (created_at desc);

-- ── 7. updates ────────────────────────────────────────────────────
create table updates (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects (id) on delete cascade,
  user_id     uuid not null references users (id) on delete cascade,
  title       text not null check (char_length(title) <= 200),
  body        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_updates_project_id on updates (project_id);
create index idx_updates_created_at on updates (created_at desc);

-- ── updated_at 자동 갱신 트리거 ──────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_users_updated_at
  before update on users
  for each row execute function set_updated_at();

create trigger trg_projects_updated_at
  before update on projects
  for each row execute function set_updated_at();

create trigger trg_fundings_updated_at
  before update on fundings
  for each row execute function set_updated_at();

create trigger trg_rewards_updated_at
  before update on rewards
  for each row execute function set_updated_at();

create trigger trg_pledges_updated_at
  before update on pledges
  for each row execute function set_updated_at();

create trigger trg_comments_updated_at
  before update on comments
  for each row execute function set_updated_at();

create trigger trg_updates_updated_at
  before update on updates
  for each row execute function set_updated_at();

-- ── 펀딩 진행률 계산 뷰 ──────────────────────────────────────────
create or replace view funding_progress as
select
  f.id,
  f.project_id,
  f.goal_amount,
  f.deadline,
  f.min_pledge_amount,
  coalesce(sum(p.amount) filter (where p.status = 'completed'), 0) as current_amount,
  count(p.id) filter (where p.status = 'completed')::int as backer_count,
  case
    when f.goal_amount = 0 then 0
    else round(
      coalesce(sum(p.amount) filter (where p.status = 'completed'), 0)::numeric
      / f.goal_amount * 100,
      1
    )
  end as progress_percent,
  greatest(0, f.deadline - current_date) as days_left
from fundings f
left join pledges p on p.project_id = f.project_id
group by f.id, f.project_id, f.goal_amount, f.deadline, f.min_pledge_amount;

-- ═══════════════════════════════════════════════════════════════════
-- PRD v2.0 추가 테이블 (기존 DB에 이미 001 적용된 경우 아래 블록만 실행)
-- ═══════════════════════════════════════════════════════════════════

-- ── ENUM: 댓글 신고 상태 ─────────────────────────────────────────
create type comment_report_status as enum ('pending', 'resolved_dismissed', 'resolved_deleted');

-- ── 8. verification_responses (검증 질문 3문항 응답) ───────────────
create table verification_responses (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects (id) on delete cascade,
  user_id     uuid not null references users (id) on delete cascade,
  question_key text not null check (question_key in ('q1_use_intent', 'q2_monthly_pay', 'q3_improvement')),
  answer      text not null,
  created_at  timestamptz not null default now(),
  unique (project_id, user_id, question_key)
);

comment on table verification_responses is 'PRD v2.0: 고정 3문항 (사용의향/월지불금액/개선점) 응답. Vibe Score 계산용.';

create index idx_verification_responses_project_id on verification_responses (project_id);
create index idx_verification_responses_question_key on verification_responses (question_key);
create index idx_verification_responses_created_at on verification_responses (created_at desc);

-- ── 9. comment_reports (댓글 신고, F-054) ───────────────────────
create table comment_reports (
  id               uuid primary key default gen_random_uuid(),
  comment_id       uuid not null references comments (id) on delete cascade,
  reporter_user_id uuid not null references users (id) on delete cascade,
  reason           text,
  status           comment_report_status not null default 'pending',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table comment_reports is 'PRD v2.0: 댓글 신고. 관리자 신고 처리(F-054)용.';

create index idx_comment_reports_comment_id on comment_reports (comment_id);
create index idx_comment_reports_status   on comment_reports (status);
create index idx_comment_reports_created_at on comment_reports (created_at desc);

create trigger trg_comment_reports_updated_at
  before update on comment_reports
  for each row execute function set_updated_at();

-- ── 10. vibe_scores (Vibe Score 1.0) ─────────────────────────────
create table vibe_scores (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null unique references projects (id) on delete cascade,
  score         numeric not null check (score >= 0),
  calculated_at timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table vibe_scores is 'PRD v2.0: 프로젝트별 Vibe Score. 체험 수·검증 응답·댓글 등 가중치 반영.';

create index idx_vibe_scores_project_id   on vibe_scores (project_id);
create index idx_vibe_scores_score       on vibe_scores (score desc);
create index idx_vibe_scores_calculated_at on vibe_scores (calculated_at desc);

create trigger trg_vibe_scores_updated_at
  before update on vibe_scores
  for each row execute function set_updated_at();
