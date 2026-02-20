-- 프로토타입용 가상 잔액 (실제 결제 없음)
-- 적용: Supabase SQL 에디터에서 실행

alter table users
  add column if not exists balance bigint not null default 0 check (balance >= 0);

comment on column users.balance is '프로토타입용 가상 잔액. 실제 결제 없이 테스트 충전만 가능.';
