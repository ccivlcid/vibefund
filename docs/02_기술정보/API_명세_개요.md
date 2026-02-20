# VibeFund API 명세 개요

백엔드(Next.js API Routes)에서 제공하는 REST API의 엔드포인트·인증·에러 형식을 정리합니다.  
기능 요구사항(F-001 ~ F-055) 및 [스키마_개요](../03_데이터베이스/스키마_개요.md)와 연동됩니다.

---

## 1. 기본 정보

| 항목 | 내용 |
|------|------|
| Base URL | `https://{도메인}/api/v1` (프로덕션). 로컬: `http://localhost:3000/api/v1` |
| 버전 | URL prefix `/api/v1` 로 버전 관리. v2 전환 시 `/api/v2` 추가 |
| 인증 | **JWT** 또는 세션 쿠키. 인증 필요 API는 `Authorization: Bearer <token>` 또는 쿠키 |
| Content-Type | 요청/응답 공통: `application/json` |

---

## 2. 인증

- **발급**: 로그인·OAuth 성공 시 응답 body 또는 Set-Cookie로 토큰 전달.
- **사용**: 인증 필요 API는 `Authorization: Bearer <JWT>` 헤더 또는 쿠키로 전달. 미전달·만료·무효 시 `401 Unauthorized`.
- **관리자 API**: `role=admin` 필요. 미권한 시 `403 Forbidden`.

---

## 3. 공통 에러 응답

일관된 형식 사용 권장:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "요청 메시지 (사람이 읽기 쉬운 설명)",
    "details": {}
  }
}
```

| HTTP 상태 | 용도 |
|-----------|------|
| 200 | 성공 (GET·PATCH 등) |
| 201 | 생성 성공 (POST) |
| 400 | Bad Request — 검증 실패, 잘못된 파라미터 |
| 401 | Unauthorized — 미인증·토큰 만료 |
| 403 | Forbidden — 권한 없음 (예: 관리자 전용) |
| 404 | Not Found — 리소스 없음 |
| 500 | Server Error — 서버 내부 오류 |

---

## 4. 엔드포인트 목록 (기능 요구사항 기준)

### 4.1 인증 (F-001, F-002)

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| POST | `/auth/register` | 회원가입 (이메일·비밀번호) | 불필요 |
| POST | `/auth/login` | 로그인 (이메일·비밀번호) | 불필요 |
| POST | `/auth/logout` | 로그아웃 | 필요 |
| GET/POST | `/auth/oauth/google` | OAuth(Google) 로그인/연동 | 상황별 |

### 4.2 사용자·프로필 (F-003, F-041)

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | `/users/me` | 내 프로필 조회 | 필요 |
| PATCH | `/users/me` | 프로필 수정 (이름, 아바타, 소개 등) | 필요 |

### 4.3 프로젝트 (F-010, F-011, F-012)

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | `/projects` | 목록 조회 (쿼리: category, status, page, limit) | 불필요 |
| GET | `/projects/:id` | 상세 조회 (미리보기 메타 포함) | 불필요 |
| POST | `/projects` | 프로젝트 생성 | 필요 |
| PATCH | `/projects/:id` | 프로젝트 수정 | 필요(본인) |
| DELETE | `/projects/:id` | 프로젝트 삭제 | 필요(본인) |

### 4.4 펀딩·리워드 (F-020, F-021, F-023)

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | `/projects/:projectId/funding` | 펀딩 설정·진행률 조회 | 불필요 |
| PUT | `/projects/:projectId/funding` | 펀딩 목표·마감·최소 후원액 설정 | 필요(제작자) |
| GET | `/projects/:projectId/rewards` | 리워드 목록 | 불필요 |
| POST | `/projects/:projectId/rewards` | 리워드 추가 | 필요(제작자) |
| PATCH | `/projects/:projectId/rewards/:id` | 리워드 수정 | 필요(제작자) |
| DELETE | `/projects/:projectId/rewards/:id` | 리워드 삭제 | 필요(제작자) |

### 4.5 댓글 (F-030)

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | `/projects/:projectId/comments` | 댓글 목록 (페이징, parent_id로 대댓글) | 불필요 |
| POST | `/projects/:projectId/comments` | 댓글 작성 (body, parent_id 선택) | 정책에 따라 선택 |
| PATCH | `/comments/:id` | 댓글 수정 | 필요(작성자) |
| DELETE | `/comments/:id` | 댓글 삭제 | 필요(작성자 또는 제작자) |

### 4.6 프로젝트 업데이트 (F-031)

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | `/projects/:projectId/updates` | 업데이트 목록 | 불필요 |
| POST | `/projects/:projectId/updates` | 업데이트 게시 | 필요(제작자) |
| PATCH | `/updates/:id` | 업데이트 수정 | 필요(작성자) |
| DELETE | `/updates/:id` | 업데이트 삭제 | 필요(작성자) |

### 4.7 마이페이지·내 데이터 (F-042, F-043, F-044)

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | `/users/me/projects` | 내 프로젝트 목록 | 필요 |
| GET | `/users/me/pledges` | 내 후원 목록 (결제 도입 후) | 필요 |
| GET | `/users/me/comments` | 내 댓글 목록 | 필요 |

### 4.8 관리자 (F-050 ~ F-054)

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | `/admin/dashboard` | KPI 요약 (회원 수, 프로젝트 수, 검수 대기 등) | admin |
| GET | `/admin/users` | 회원 목록·검색 | admin |
| PATCH | `/admin/users/:id` | 회원 정지·권한 변경 | admin |
| GET | `/admin/projects` | 프로젝트 목록·검수 대기 | admin |
| PATCH | `/admin/projects/:id/approval` | 승인/반려/비공개, 반려 사유 | admin |
| GET | `/admin/comments` | 댓글·신고 목록 | admin |
| DELETE | `/admin/comments/:id` | 댓글 삭제 등 처리 | admin |

---

## 5. 요청·응답 예시 (참고)

- **POST /api/v1/auth/register**  
  Request: `{ "email", "password", "name?" }`  
  Response 201: `{ "user": { "id", "email", "name" }, "token" }` (또는 Set-Cookie)

- **GET /api/v1/projects/:id**  
  Response 200: `{ "id", "title", "short_description", "description", "service_url", "category", "thumbnail_url", "status", "user": { "id", "name" }, "funding": { "goal_amount", "deadline", "current_amount?", "progress_percent?" }, "rewards": [] }`

- **에러 400**  
  Response: `{ "error": { "code": "VALIDATION_ERROR", "message": "service_url is required", "details": { "field": "service_url" } } }`

---

## 6. 보완

- 각 엔드포인트별 상세 스키마(필수/선택 필드, 타입)는 구현 단계에서 OpenAPI(Swagger) 또는 별도 마크다운 테이블로 확장 권장.
- 결제 도입 시(F-022): `POST /api/v1/pledges`, 웹훅 등 Stripe 연동 API 추가.

---
*작성일: 2025-02-20 | 기능_요구사항·스키마_개요 기준*
