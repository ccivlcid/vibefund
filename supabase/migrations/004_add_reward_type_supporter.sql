-- 리워드 유형에 '서포터' 추가
-- 적용: Supabase SQL 에디터 또는 supabase db push

alter type reward_type add value if not exists 'supporter';

comment on type reward_type is 'beta, lifetime, subscription_discount, supporter';
