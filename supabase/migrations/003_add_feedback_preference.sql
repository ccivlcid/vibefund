-- Launch Step2: 프로젝트별 원하는 피드백 유형 (검증 설정)
-- 적용: Supabase SQL 에디터 또는 supabase db push

alter table projects
  add column if not exists feedback_preference text
  check (feedback_preference is null or feedback_preference in ('validation_focus', 'comments_focus', 'both'));

comment on column projects.feedback_preference is '원하는 피드백 유형: validation_focus(검증 질문 위주), comments_focus(댓글 위주), both(둘 다)';
