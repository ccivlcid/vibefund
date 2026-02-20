# API 컨벤션

Next.js API Routes (`apps/web/src/app/api/v1/`) 작성 시 적용하는 규칙입니다.

---

## 1. 기본 정보

| 항목 | 내용 |
|------|------|
| Base URL | `/api/v1` |
| Content-Type | 요청/응답 공통 `application/json` |
| 인증 | JWT `Authorization: Bearer <token>` 또는 쿠키 |

---

## 2. 라우트 계층

- **역할**: URL·HTTP 메서드 매핑만 담당.
- **검증**: 요청 바디는 Zod 등으로 검증. `parseBody(req, schema)` 활용.
- **인증**: 인증 필요 라우트는 `withAuth`, 관리자 전용은 `withAdmin` 래퍼 사용.
- **비즈니스 로직**: 라우트에 직접 두지 말고 서비스·유스케이스로 분리.

---

## 3. 요청·응답 (DTO)

- **요청**: 스키마로 검증된 타입 사용. `z.infer<typeof schema>` 또는 명시적 타입.
- **응답**: `successResponse(data)`, `paginatedResponse(data, meta)` 등 공통 헬퍼 사용.
- **원칙**: 내부 도메인 엔티티를 그대로 노출하지 않고, 필요한 필드만 DTO로 반환.

---

## 4. 에러 응답 형식

일관된 형식 사용:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "사람이 읽기 쉬운 설명",
    "details": {}
  }
}
```

| HTTP 상태 | 용도 |
|-----------|------|
| 200 | 성공 (GET, PATCH 등) |
| 201 | 생성 성공 (POST) |
| 400 | Bad Request — 검증 실패, 잘못된 파라미터 |
| 401 | Unauthorized — 미인증·토큰 만료 |
| 403 | Forbidden — 권한 없음 (예: 관리자 전용) |
| 404 | Not Found — 리소스 없음 |
| 500 | Server Error — 서버 내부 오류 |

- `errorResponse(status, code, message, details?)` 사용.

---

## 5. 인증

- **발급**: 로그인 성공 시 응답 body 또는 Set-Cookie로 토큰 전달.
- **사용**: 인증 필요 API는 `Authorization: Bearer <JWT>` 또는 쿠키. 미전달·만료·무효 시 401.
- **관리자 API**: `role=admin` 필요. 미권한 시 403.

---

## 6. 타입·검증

- 요청 body는 Zod 스키마로 파싱. `parseBody<OutputType>(req, schema)` 로 제네릭 지정 시 `parsed.data` 타입 보장.
- 콜백 인자에 `any` 방지: `transform((s: string) => ...)`, `refine((s: string) => ...)` 등 명시적 타입.

---

*참고: docs/02_기술정보/API_명세_개요.md, apps/web/src/lib/auth.ts, apps/web/src/lib/validate.ts*
