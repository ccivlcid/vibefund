# VibeFund API 명세 상세

> 기능 요구사항(F-001 ~ F-054) 및 [스키마_개요](../03_데이터베이스/스키마_개요.md)와 연동.
> Base URL: `https://{도메인}/api/v1` | 로컬: `http://localhost:3000/api/v1`
> 인증: `Authorization: Bearer <JWT>` 또는 HttpOnly 세션 쿠키
> Content-Type: `application/json`

---

## 공통 응답 형식

### 성공
```json
{
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 100 }
}
```

### 에러
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "사람이 읽기 쉬운 설명",
    "details": { "field": "email", "reason": "이미 사용 중인 이메일" }
  }
}
```

### HTTP 상태 코드
| 코드 | 의미 |
|------|------|
| 200 | 성공 (GET, PATCH) |
| 201 | 생성 성공 (POST) |
| 204 | 성공, 응답 본문 없음 (DELETE) |
| 400 | Bad Request — 유효성 검사 실패 |
| 401 | Unauthorized — 미인증 또는 토큰 만료 |
| 403 | Forbidden — 권한 없음 |
| 404 | Not Found — 리소스 없음 |
| 409 | Conflict — 중복 (이메일 등) |
| 500 | Internal Server Error |

### 페이징 쿼리 파라미터 (목록 API 공통)
| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| `page` | number | 1 | 페이지 번호 (1부터 시작) |
| `limit` | number | 20 | 페이지당 항목 수 (최대 100) |

---

## 1. 인증 (F-001, F-002)

### POST `/auth/register` — 회원가입

**Request Body**
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `email` | string | ✅ | 유효한 이메일 형식 |
| `password` | string | ✅ | 최소 8자, 영문+숫자 조합 권장 |
| `name` | string | ❌ | 표시 이름 (미입력 시 이메일 앞부분 사용) |

```json
{
  "email": "user@example.com",
  "password": "SecurePass1!",
  "name": "홍길동"
}
```

**Response 201**
```json
{
  "data": {
    "user": {
      "id": "uuid-v4",
      "email": "user@example.com",
      "name": "홍길동",
      "role": "user",
      "created_at": "2025-02-20T00:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**에러 케이스**
| 상태 | 코드 | 메시지 |
|------|------|--------|
| 400 | `VALIDATION_ERROR` | 이메일 형식 오류 또는 비밀번호 조건 미충족 |
| 409 | `EMAIL_ALREADY_EXISTS` | 이미 사용 중인 이메일 |

---

### POST `/auth/login` — 로그인

**Request Body**
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `email` | string | ✅ | 가입된 이메일 |
| `password` | string | ✅ | 비밀번호 |

```json
{
  "email": "user@example.com",
  "password": "SecurePass1!"
}
```

**Response 200**
```json
{
  "data": {
    "user": {
      "id": "uuid-v4",
      "email": "user@example.com",
      "name": "홍길동",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**에러 케이스**
| 상태 | 코드 | 메시지 |
|------|------|--------|
| 400 | `VALIDATION_ERROR` | 필수 필드 누락 |
| 401 | `INVALID_CREDENTIALS` | 이메일 또는 비밀번호 불일치 |

---

### POST `/auth/logout` — 로그아웃

**Headers**: `Authorization: Bearer <token>` (필수)

**Response 204** (본문 없음)

---

### GET `/auth/oauth/google` — Google OAuth 시작

리다이렉트 방식. 호출 시 Google OAuth 동의 화면으로 이동.

**Query Params**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `redirect_uri` | string | OAuth 완료 후 돌아올 클라이언트 URL |

**Response**: 302 Redirect → Google 로그인 화면

---

### GET `/auth/oauth/google/callback` — Google OAuth 콜백

Google에서 코드를 받아 처리 후 JWT 발급.

**Response 200** — 로그인/회원가입 성공 시 register와 동일한 user + token 반환

---

## 2. 사용자·프로필 (F-003, F-041)

### GET `/users/me` — 내 프로필 조회

**Headers**: `Authorization: Bearer <token>` (필수)

**Response 200**
```json
{
  "data": {
    "id": "uuid-v4",
    "email": "user@example.com",
    "name": "홍길동",
    "avatar_url": "https://...",
    "bio": "노코드 창업자입니다.",
    "provider": "email",
    "role": "user",
    "created_at": "2025-02-20T00:00:00Z"
  }
}
```

---

### PATCH `/users/me` — 내 프로필 수정

**Headers**: `Authorization: Bearer <token>` (필수)

**Request Body** (변경할 필드만 포함)
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | string | ❌ | 표시 이름 |
| `avatar_url` | string | ❌ | 프로필 이미지 URL |
| `bio` | string | ❌ | 자기소개 (최대 200자) |

```json
{
  "name": "홍길동",
  "bio": "노코드 창업자입니다."
}
```

**Response 200** — 수정된 프로필 반환 (GET `/users/me`와 동일 구조)

---

## 3. 프로젝트 (F-010, F-011, F-012)

### GET `/projects` — 목록 조회

**Query Params**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `category` | string | 카테고리 필터 (예: `saas`, `app`, `tool`) |
| `status` | string | 상태 필터: `Prototype` \| `Beta` \| `Live` |
| `approval_status` | string | 검수 상태 필터: `approved` (공개용, 기본값) |
| `page` | number | 페이지 번호 |
| `limit` | number | 페이지 크기 |

**Response 200**
```json
{
  "data": [
    {
      "id": "uuid-v4",
      "title": "프로젝트명",
      "short_description": "한 줄 설명",
      "category": "saas",
      "status": "Beta",
      "thumbnail_url": "https://...",
      "service_url": "https://example.com",
      "user": { "id": "uuid", "name": "제작자명" },
      "funding": {
        "goal_amount": 5000000,
        "deadline": "2025-06-30",
        "progress_percent": 42
      },
      "created_at": "2025-02-20T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 87 }
}
```

---

### GET `/projects/:id` — 상세 조회

**Response 200**
```json
{
  "data": {
    "id": "uuid-v4",
    "title": "프로젝트명",
    "short_description": "한 줄 설명",
    "description": "상세 설명 (마크다운 또는 HTML)",
    "service_url": "https://example.com",
    "category": "saas",
    "status": "Beta",
    "approval_status": "approved",
    "thumbnail_url": "https://...",
    "user": { "id": "uuid", "name": "제작자명", "avatar_url": "https://..." },
    "funding": {
      "id": "uuid",
      "goal_amount": 5000000,
      "deadline": "2025-06-30",
      "min_pledge_amount": 10000,
      "current_amount": 2100000,
      "progress_percent": 42
    },
    "rewards": [
      {
        "id": "uuid",
        "name": "베타 얼리버드",
        "description": "베타 서비스 1년 무료 이용",
        "amount": 30000,
        "type": "beta"
      }
    ],
    "created_at": "2025-02-20T00:00:00Z",
    "updated_at": "2025-02-20T00:00:00Z"
  }
}
```

**에러 케이스**
| 상태 | 코드 | 메시지 |
|------|------|--------|
| 404 | `PROJECT_NOT_FOUND` | 프로젝트를 찾을 수 없음 |

---

### POST `/projects` — 프로젝트 생성

**Headers**: `Authorization: Bearer <token>` (필수)

**Request Body**
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `title` | string | ✅ | 프로젝트 제목 (최대 100자) |
| `short_description` | string | ✅ | 한 줄 설명 (최대 200자) |
| `service_url` | string | ✅ | 서비스 URL (https:// 형식) |
| `description` | string | ❌ | 상세 설명 |
| `category` | string | ❌ | 카테고리 |
| `status` | string | ❌ | `Prototype` \| `Beta` \| `Live` (기본: `Prototype`) |
| `thumbnail_url` | string | ❌ | 썸네일 URL (미입력 시 서비스 URL OG 이미지 자동 수집) |

```json
{
  "title": "MyNoCode App",
  "short_description": "노코드로 만든 SaaS 툴",
  "service_url": "https://myapp.example.com",
  "category": "saas",
  "status": "Beta"
}
```

**Response 201** — 생성된 프로젝트 (GET `/projects/:id`와 동일 구조)

**에러 케이스**
| 상태 | 코드 | 메시지 |
|------|------|--------|
| 400 | `VALIDATION_ERROR` | 필수 필드 누락 또는 URL 형식 오류 |

---

### PATCH `/projects/:id` — 프로젝트 수정

**Headers**: `Authorization: Bearer <token>` (필수, 본인 프로젝트)

**Request Body** — POST와 동일한 필드, 변경할 것만 포함

**Response 200** — 수정된 프로젝트

**에러 케이스**
| 상태 | 코드 | 메시지 |
|------|------|--------|
| 403 | `FORBIDDEN` | 본인 프로젝트가 아님 |
| 404 | `PROJECT_NOT_FOUND` | 프로젝트를 찾을 수 없음 |

---

### DELETE `/projects/:id` — 프로젝트 삭제

**Headers**: `Authorization: Bearer <token>` (필수, 본인 프로젝트)

**Response 204** (본문 없음, 소프트 삭제 - `deleted_at` 처리)

---

## 4. 펀딩·리워드 (F-020, F-021, F-023)

### GET `/projects/:projectId/funding` — 펀딩 조회

**Response 200**
```json
{
  "data": {
    "id": "uuid",
    "project_id": "uuid",
    "goal_amount": 5000000,
    "deadline": "2025-06-30",
    "min_pledge_amount": 10000,
    "current_amount": 2100000,
    "progress_percent": 42,
    "days_left": 130
  }
}
```

---

### PUT `/projects/:projectId/funding` — 펀딩 설정 생성/수정

**Headers**: `Authorization: Bearer <token>` (필수, 프로젝트 제작자)

**Request Body**
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `goal_amount` | number | ✅ | 목표 금액 (원 단위, 최소 100,000) |
| `deadline` | string | ✅ | 마감일 (ISO 8601 날짜, 예: `2025-06-30`) |
| `min_pledge_amount` | number | ❌ | 최소 후원 금액 (기본: 1,000) |

```json
{
  "goal_amount": 5000000,
  "deadline": "2025-06-30",
  "min_pledge_amount": 10000
}
```

**Response 200** — 저장된 펀딩 정보

---

### GET `/projects/:projectId/rewards` — 리워드 목록

**Response 200**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "베타 얼리버드",
      "description": "베타 서비스 1년 무료 이용",
      "amount": 30000,
      "type": "beta"
    }
  ]
}
```

---

### POST `/projects/:projectId/rewards` — 리워드 추가

**Headers**: `Authorization: Bearer <token>` (필수, 프로젝트 제작자)

**Request Body**
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | string | ✅ | 리워드 이름 |
| `description` | string | ✅ | 리워드 설명 |
| `amount` | number | ✅ | 후원 금액 (원 단위) |
| `type` | string | ✅ | `beta` \| `lifetime` \| `subscription_discount` |

```json
{
  "name": "베타 얼리버드",
  "description": "베타 서비스 1년 무료 이용",
  "amount": 30000,
  "type": "beta"
}
```

**Response 201** — 생성된 리워드

---

### PATCH `/projects/:projectId/rewards/:id` — 리워드 수정

**Headers**: `Authorization: Bearer <token>` (필수, 프로젝트 제작자)

**Request Body** — POST와 동일 필드, 변경할 것만

**Response 200** — 수정된 리워드

---

### DELETE `/projects/:projectId/rewards/:id` — 리워드 삭제

**Headers**: `Authorization: Bearer <token>` (필수, 프로젝트 제작자)

**Response 204**

---

## 5. 댓글 (F-030)

### GET `/projects/:projectId/comments` — 댓글 목록

**Query Params**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `parent_id` | string \| null | null이면 최상위 댓글만. UUID 지정 시 해당 댓글의 대댓글 |
| `page` | number | 페이지 번호 |
| `limit` | number | 페이지 크기 |

**Response 200**
```json
{
  "data": [
    {
      "id": "uuid",
      "body": "댓글 내용",
      "parent_id": null,
      "user": { "id": "uuid", "name": "작성자", "avatar_url": "https://..." },
      "reply_count": 2,
      "created_at": "2025-02-20T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 45 }
}
```

---

### POST `/projects/:projectId/comments` — 댓글 작성

**Headers**: `Authorization: Bearer <token>` (로그인 필요 여부는 정책에 따라)

**Request Body**
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `body` | string | ✅ | 댓글 내용 (최대 1,000자) |
| `parent_id` | string | ❌ | 대댓글 시 부모 댓글 UUID |

```json
{
  "body": "정말 좋은 서비스네요!",
  "parent_id": null
}
```

**Response 201** — 생성된 댓글

---

### PATCH `/comments/:id` — 댓글 수정

**Headers**: `Authorization: Bearer <token>` (필수, 작성자)

**Request Body**
```json
{ "body": "수정된 댓글 내용" }
```

**Response 200** — 수정된 댓글

---

### DELETE `/comments/:id` — 댓글 삭제

**Headers**: `Authorization: Bearer <token>` (필수, 작성자 또는 프로젝트 제작자)

**Response 204**

---

## 6. 프로젝트 업데이트 (F-031)

### GET `/projects/:projectId/updates` — 업데이트 목록

**Response 200**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "v1.2 업데이트 소식",
      "body": "새로운 기능이 추가되었습니다.",
      "user": { "id": "uuid", "name": "제작자명" },
      "created_at": "2025-02-20T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5 }
}
```

---

### POST `/projects/:projectId/updates` — 업데이트 게시

**Headers**: `Authorization: Bearer <token>` (필수, 프로젝트 제작자)

**Request Body**
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `title` | string | ✅ | 업데이트 제목 |
| `body` | string | ✅ | 업데이트 내용 |

```json
{
  "title": "v1.2 업데이트 소식",
  "body": "새로운 기능이 추가되었습니다."
}
```

**Response 201** — 생성된 업데이트

---

### PATCH `/updates/:id` — 업데이트 수정

**Request Body** — POST와 동일 필드

**Response 200**

---

### DELETE `/updates/:id` — 업데이트 삭제

**Response 204**

---

## 7. 마이페이지 (F-042, F-043, F-044)

모든 엔드포인트: `Authorization: Bearer <token>` (필수)

### GET `/users/me/projects` — 내 프로젝트 목록

**Query Params**: `page`, `limit`, `status` (선택)

**Response 200**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "프로젝트명",
      "status": "Beta",
      "approval_status": "pending",
      "funding": { "progress_percent": 42 },
      "created_at": "2025-02-20T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 3 }
}
```

---

### GET `/users/me/pledges` — 내 후원 목록

> ⚠️ 결제 도입 후 활성화. 현재는 빈 배열 반환.

**Response 200**
```json
{
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 0 }
}
```

---

### GET `/users/me/comments` — 내 댓글 목록

**Response 200**
```json
{
  "data": [
    {
      "id": "uuid",
      "body": "댓글 내용",
      "project": { "id": "uuid", "title": "프로젝트명" },
      "created_at": "2025-02-20T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 12 }
}
```

---

## 8. 관리자 (F-050 ~ F-054)

모든 엔드포인트: `Authorization: Bearer <token>` (필수, `role=admin`)
미인증 시 401, 권한 없음 시 403 반환.

### GET `/admin/dashboard` — KPI 대시보드

**Response 200**
```json
{
  "data": {
    "total_users": 342,
    "total_projects": 87,
    "pending_approval": 5,
    "total_funding_amount": 128000000,
    "new_users_this_week": 24,
    "new_projects_this_week": 8
  }
}
```

---

### GET `/admin/users` — 회원 목록

**Query Params**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `search` | string | 이름 또는 이메일 검색 |
| `role` | string | `user` \| `admin` 필터 |
| `page` | number | 페이지 번호 |
| `limit` | number | 페이지 크기 |

**Response 200**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "홍길동",
      "role": "user",
      "is_suspended": false,
      "created_at": "2025-02-20T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 342 }
}
```

---

### PATCH `/admin/users/:id` — 회원 정지·권한 변경

**Request Body**
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `role` | string | ❌ | `user` \| `admin` |
| `is_suspended` | boolean | ❌ | 계정 정지 여부 |

```json
{ "is_suspended": true }
```

**Response 200** — 변경된 회원 정보

---

### GET `/admin/projects` — 프로젝트 목록 (검수)

**Query Params**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `approval_status` | string | `pending` \| `approved` \| `rejected` 필터 |
| `search` | string | 제목 검색 |
| `page` | number | 페이지 번호 |
| `limit` | number | 페이지 크기 |

**Response 200** — GET `/projects` 목록과 유사, `approval_status` 포함

---

### PATCH `/admin/projects/:id/approval` — 프로젝트 검수 처리

**Request Body**
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `approval_status` | string | ✅ | `approved` \| `rejected` \| `hidden` |
| `rejection_reason` | string | 조건부 | `rejected` 시 필수. 반려 사유 |

```json
{
  "approval_status": "rejected",
  "rejection_reason": "서비스 URL 접근 불가"
}
```

**Response 200** — 처리된 프로젝트 정보

---

### GET `/admin/comments` — 댓글·신고 목록

**Query Params**: `project_id` (선택), `page`, `limit`

**Response 200**
```json
{
  "data": [
    {
      "id": "uuid",
      "body": "댓글 내용",
      "project": { "id": "uuid", "title": "프로젝트명" },
      "user": { "id": "uuid", "name": "작성자" },
      "created_at": "2025-02-20T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 230 }
}
```

---

### DELETE `/admin/comments/:id` — 댓글 삭제 처리

**Response 204**

---

## 에러 코드 전체 목록

| 코드 | HTTP | 설명 |
|------|------|------|
| `VALIDATION_ERROR` | 400 | 요청 데이터 유효성 검사 실패 |
| `UNAUTHORIZED` | 401 | 인증 토큰 없음 또는 만료 |
| `INVALID_CREDENTIALS` | 401 | 이메일/비밀번호 불일치 |
| `FORBIDDEN` | 403 | 권한 없음 (타인 리소스, 관리자 전용 등) |
| `NOT_FOUND` | 404 | 리소스 없음 |
| `EMAIL_ALREADY_EXISTS` | 409 | 이메일 중복 |
| `PROJECT_NOT_FOUND` | 404 | 프로젝트 없음 |
| `COMMENT_NOT_FOUND` | 404 | 댓글 없음 |
| `INTERNAL_ERROR` | 500 | 서버 내부 오류 |

---

*작성일: 2025-02-20 | 기능_요구사항·스키마_개요 기준 | 상세 스키마 버전*
