-- Community 게시글 댓글
-- 마이그레이션: 009_community_post_comments.sql

create table community_post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references community_posts (id) on delete cascade,
  user_id    uuid not null references users (id) on delete cascade,
  parent_id  uuid references community_post_comments (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table community_post_comments is 'Community 게시글 댓글/대댓글.';

create index idx_community_post_comments_post_id   on community_post_comments (post_id);
create index idx_community_post_comments_parent_id  on community_post_comments (parent_id);
create index idx_community_post_comments_created_at on community_post_comments (post_id, created_at);

create trigger trg_community_post_comments_updated_at
  before update on community_post_comments
  for each row execute function set_updated_at();
