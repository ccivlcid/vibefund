-- AI 이사회 사전심사 시스템 (PRD: AI이사회사전심사시스템PRD.md)
-- 마이그레이션: 005_ai_board.sql
-- 적용: Supabase SQL 에디터 또는 supabase db push

-- ── ENUM: AI 이사회 등급 ────────────────────────────────────────
create type ai_board_grade as enum ('A', 'B', 'C', 'D');

comment on type ai_board_grade is 'AI 이사회 종합 등급. A: 8.0 이상, B: 6.5~7.9, C: 5.0~6.4, D: 5.0 미만';

-- ── 11. ai_board_members (멤버 풀) ────────────────────────────────
create table ai_board_members (
  id                    uuid primary key default gen_random_uuid(),
  key                   text not null unique check (char_length(key) <= 50),
  display_name          text not null check (char_length(display_name) <= 100),
  perspective           text check (char_length(perspective) <= 500),
  default_weight_percent int not null default 0 check (default_weight_percent >= 0 and default_weight_percent <= 100),
  is_active             boolean not null default true,
  sort_order            int not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table ai_board_members is 'AI 이사회 멤버 풀. 유명인 페르소나. 운영자가 추가·비활성화 가능.';
comment on column ai_board_members.key is '고유 키. 예: buffett, jobs, karpathy, gates, musk, lynch, thiel';
comment on column ai_board_members.default_weight_percent is '기본 가중치(%). 프로젝트별 선택 시 override 가능.';

create index idx_ai_board_members_key       on ai_board_members (key);
create index idx_ai_board_members_is_active on ai_board_members (is_active);
create index idx_ai_board_members_sort_order on ai_board_members (sort_order);

create trigger trg_ai_board_members_updated_at
  before update on ai_board_members
  for each row execute function set_updated_at();

-- ── 12. project_ai_board_selections (프로젝트별 유저 선택) ────────
create table project_ai_board_selections (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references projects (id) on delete cascade,
  ai_board_member_id uuid not null references ai_board_members (id) on delete cascade,
  weight_percent     int check (weight_percent is null or (weight_percent >= 0 and weight_percent <= 100)),
  created_at         timestamptz not null default now(),
  unique (project_id, ai_board_member_id)
);

comment on table project_ai_board_selections is '프로젝트 등록 유저가 “포함”한 AI 이사회 멤버. 제외한 멤버는 row 없음.';
comment on column project_ai_board_selections.weight_percent is '해당 프로젝트에서의 가중치(%). null이면 멤버 default_weight_percent 사용.';

create index idx_project_ai_board_selections_project_id on project_ai_board_selections (project_id);
create index idx_project_ai_board_selections_member_id   on project_ai_board_selections (ai_board_member_id);

-- ── 13. ai_board_reports (심사 결과) ──────────────────────────────
create table ai_board_reports (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects (id) on delete cascade,
  overall_score numeric not null check (overall_score >= 0 and overall_score <= 10),
  grade         ai_board_grade not null,
  strengths     jsonb default '[]'::jsonb,
  risks         jsonb default '[]'::jsonb,
  improvements  jsonb default '[]'::jsonb,
  calculated_at timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

comment on table ai_board_reports is '프로젝트별 AI 이사회 심사 결과. 이력 가능, 최신 1건 활용 권장.';
comment on column ai_board_reports.strengths is '강점 목록. 예: ["명확한 타겟", "차별화 포인트"]';
comment on column ai_board_reports.risks is '핵심 리스크 목록.';
comment on column ai_board_reports.improvements is '즉시 개선 항목 목록.';

create index idx_ai_board_reports_project_id   on ai_board_reports (project_id);
create index idx_ai_board_reports_calculated_at on ai_board_reports (calculated_at desc);
create index idx_ai_board_reports_grade        on ai_board_reports (grade);

-- ── 14. ai_board_report_scores (멤버별 점수·피드백) ───────────────
create table ai_board_report_scores (
  id                 uuid primary key default gen_random_uuid(),
  ai_board_report_id uuid not null references ai_board_reports (id) on delete cascade,
  ai_board_member_id uuid not null references ai_board_members (id) on delete cascade,
  score              numeric not null check (score >= 0 and score <= 10),
  feedback           text,
  details            jsonb default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  unique (ai_board_report_id, ai_board_member_id)
);

comment on table ai_board_report_scores is '심사 결과 내 멤버별 점수·피드백. 멤버 추가 시에도 확장 가능.';

create index idx_ai_board_report_scores_report_id on ai_board_report_scores (ai_board_report_id);
create index idx_ai_board_report_scores_member_id on ai_board_report_scores (ai_board_member_id);

-- ── 시드: 기본 멤버 풀 7인 ───────────────────────────────────────
insert into ai_board_members (key, display_name, perspective, default_weight_percent, sort_order) values
  ('buffett',  '버핏 AI',   '투자 가치, 재무 건전성, 이해 가능한 비즈니스', 40, 1),
  ('jobs',     '잡스 AI',   '비전·제품, 포지셔닝, 사용자 경험·스토리', 30, 2),
  ('karpathy', 'Karpathy AI', '기술 실행 가능성, AI 활용, 구현 현실성', 30, 3),
  ('gates',    '빌 게이츠 AI', '기술의 사회적 영향, 스케일·표준화, 기부·임팩트', 0, 4),
  ('musk',     '머스크 AI',  '비전·실행력, 제조·인프라, 규모의 경제', 0, 5),
  ('lynch',    '피터 린치 AI', '소비자 관점, 이해할 수 있는 비즈니스, 성장 가능성', 0, 6),
  ('thiel',    '피터 틸 AI',  '독점·차별화, 0→1 혁신, 비밀·리스크', 0, 7)
on conflict (key) do nothing;
