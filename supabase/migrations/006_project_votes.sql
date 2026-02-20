-- 프로젝트 따봉(추천) / 비추(비추천) — Vibe Score 관련 투표
-- 마이그레이션: 006_project_votes.sql

create type project_vote_type as enum ('up', 'down');

comment on type project_vote_type is '프로젝트 추천(따봉) up / 비추천 down';

create table project_votes (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  user_id    uuid not null references users (id) on delete cascade,
  vote       project_vote_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, user_id)
);

comment on table project_votes is '프로젝트별 유저 추천(따봉)/비추천. 한 유저당 프로젝트당 1표.';

create index idx_project_votes_project_id on project_votes (project_id);
create index idx_project_votes_user_id   on project_votes (user_id);
create index idx_project_votes_vote      on project_votes (vote);

create trigger trg_project_votes_updated_at
  before update on project_votes
  for each row execute function set_updated_at();
