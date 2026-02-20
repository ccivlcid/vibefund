-- Community 채팅방 (카카오톡 스타일)
-- 마이그레이션: 008_community_chat.sql

create table chat_rooms (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  name       text not null check (char_length(name) between 1 and 100),
  created_at timestamptz not null default now()
);

comment on table chat_rooms is 'Community 채팅방. key: discussion, learning 등.';

create table chat_messages (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references chat_rooms (id) on delete cascade,
  user_id    uuid not null references users (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

comment on table chat_messages is '채팅방 메시지.';

create index idx_chat_messages_room_id    on chat_messages (room_id);
create index idx_chat_messages_created_at on chat_messages (room_id, created_at desc);
