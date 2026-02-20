# 프론트엔드 컨벤션

Next.js + React + Tailwind (`apps/web`) 클라이언트 코드 작성 시 적용하는 규칙입니다.

---

## 1. 컴포넌트

- **단일 책임**: 한 컴포넌트는 한 가지 역할. 재사용 가능한 작은 단위로 분리.
- **위치**: 공용 UI는 `src/components/ui/`, 페이지 전용은 해당 `app/` 하위 또는 `components/` 활용.
- **스타일**: Tailwind CSS. 공통 스타일은 `cn()` 등으로 조합.

---

## 2. 상태

- **전역 상태**: 필요한 범위만. 폼·페이지 단위 상태는 로컬(state) 우선.
- **서버 상태**: 캐시·재검증 전략 명시 (필요 시 SWR, React Query 등).
- **인증**: `AuthContext` 등 컨텍스트로 사용자·토큰 관리. API 호출 시 `credentials: 'include'`로 쿠키 전달.

---

## 3. API 호출

- **클라이언트**: `src/lib/api.ts`의 `api.get/post/put/patch/delete` 사용. Base는 `/api/v1`.
- **에러 처리**: API 에러는 `{ error: { code, message } }` 형태. 표시 시 `err?.error?.message ?? err?.message` 등으로 메시지 추출.
- **로딩·에러 UI**: 로딩 시 버튼 비활성화·스피너, 에러 시 사용자에게 명확한 메시지와 재시도 유도.

---

## 4. UI/UX 원칙

- **제작자(비개발자)**: 단계가 명확한 등록·설정 흐름. URL만 넣어도 미리보기 가능하게.
- **로딩**: 스켈레톤 또는 스피너. 3초 초과 시 안내 메시지.
- **빈 상태**: "아직 ~ 없어요" 등 메시지 + CTA.
- **에러**: 네트워크·API 에러 시 명확한 메시지 + 재시도 버튼.
- **성공**: 등록·수정 완료 시 축하 메시지·다음 단계 안내.
- **반응형**: 모바일 대응. `sm:`, `md:` 등 브레이크포인트 활용.

---

## 5. 접근성·폼

- **에러 알림**: `role="alert"` 사용. 스크린 리더 대응.
- **폼**: `label`, `error`, `hint` 등으로 입력 가이드. 필수 항목은 클라이언트 검증 + 서버 검증.
- **버튼**: 로딩 중 `disabled` 및 로딩 표시(스피너·문구).

---

## 6. 경로·import

- **경로 별칭**: `@/` → `src/` (예: `@/components/ui/button`, `@/lib/api`).
- **공용 패키지**: `@vibefund/shared` 등 workspace 패키지 활용.

---

*참고: docs/10_UI_UX자료/UI_UX_가이드_개요.md, apps/web/src/components/ui/**
