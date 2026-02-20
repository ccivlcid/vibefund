-- Community 게시판 (자유 토론 / 창업 학습)
-- 마이그레이션: 007_community_posts.sql

create table community_posts (
  id         uuid primary key default gen_random_uuid(),
  board      text not null check (board in ('discussion', 'learning')),
  user_id    uuid not null references users (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 200),
  body       text not null check (char_length(body) between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table community_posts is 'Community 게시글. board: discussion(자유 토론) / learning(창업 학습).';

create index idx_community_posts_board      on community_posts (board);
create index idx_community_posts_created_at on community_posts (created_at desc);
create index idx_community_posts_user_id    on community_posts (user_id);

create trigger trg_community_posts_updated_at
  before update on community_posts
  for each row execute function set_updated_at();
