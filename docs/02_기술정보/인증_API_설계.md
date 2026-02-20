# VibeFund 인증 API 설계

> Supabase Auth 미사용. Next.js API Routes에서 직접 구현하는 인증 시스템.
> 관련 문서: [API_명세_상세.md](./API_명세_상세.md) | [환경변수_설정.md](./환경변수_설정.md)

---

## 1. 설계 원칙

| 항목 | 결정 | 이유 |
|------|------|------|
| 인증 방식 | **JWT (Access Token)** | Stateless, Vercel 서버리스 환경에 적합 |
| 토큰 저장 | **HttpOnly Cookie** | XSS 공격 방어 (JS에서 접근 불가) |
| 비밀번호 해싱 | **bcrypt** (rounds=12) | 단방향 암호화, 무차별 대입 공격 방어 |
| OAuth 제공자 | **Google** (MVP), 추후 확장 가능 | 노코드 창업자 타겟의 주요 소셜 계정 |
| Refresh Token | MVP 범위 제외 (단순화) | 추후 보안 강화 시 도입 |

---

## 2. JWT 페이로드 구조

```json
{
  "sub": "uuid-v4",
  "email": "user@example.com",
  "role": "user",
  "iat": 1740000000,
  "exp": 1740086400
}
```

| 필드 | 설명 |
|------|------|
| `sub` | users 테이블 UUID (Subject) |
| `email` | 사용자 이메일 |
| `role` | `user` 또는 `admin` (권한 체크용) |
| `iat` | 발급 시각 (Issued At, Unix timestamp) |
| `exp` | 만료 시각 (Expiration, `iat + 24시간`) |

**토큰 유효 기간**: 24시간 (환경변수 `JWT_EXPIRES_IN`으로 설정)

---

## 3. 이메일 회원가입/로그인 플로우

### 3.1 회원가입

```
클라이언트                     서버 (API Route)            DB (Supabase)
    │                               │                          │
    │── POST /api/v1/auth/register ─▶│                          │
    │   { email, password, name? }  │                          │
    │                               │── SELECT * FROM users ──▶│
    │                               │   WHERE email = ?         │
    │                               │◀── 결과 없음 (신규) ───────│
    │                               │                          │
    │                               │ bcrypt.hash(password, 12)│
    │                               │                          │
    │                               │── INSERT INTO users ─────▶│
    │                               │   (id, email, pw_hash,   │
    │                               │    name, role='user')    │
    │                               │◀── 생성된 user ───────────│
    │                               │                          │
    │                               │ jwt.sign(payload, secret)│
    │◀── 201 { user, token } ────────│                          │
    │    Set-Cookie: token=JWT;     │                          │
    │    HttpOnly; Secure; SameSite │                          │
```

### 3.2 로그인

```
클라이언트                     서버 (API Route)            DB (Supabase)
    │                               │                          │
    │── POST /api/v1/auth/login ───▶│                          │
    │   { email, password }         │                          │
    │                               │── SELECT * FROM users ──▶│
    │                               │   WHERE email = ?         │
    │                               │◀── user 레코드 ───────────│
    │                               │                          │
    │                               │ bcrypt.compare(          │
    │                               │   input_pw, user.pw_hash)│
    │                               │                          │
    │                               │ jwt.sign(payload, secret)│
    │◀── 200 { user, token } ────────│                          │
    │    Set-Cookie: token=JWT      │                          │
```

### 3.3 로그아웃

```
클라이언트                     서버 (API Route)
    │                               │
    │── POST /api/v1/auth/logout ──▶│
    │   Cookie: token=JWT           │
    │                               │ Set-Cookie: token='';
    │                               │ Expires=Thu, 01 Jan 1970
    │◀── 204 ────────────────────────│
```

---

## 4. Google OAuth 플로우

### 4.1 사전 설정

| 항목 | 값 |
|------|-----|
| Provider | Google Cloud Console > OAuth 2.0 |
| Redirect URI | `https://{도메인}/api/v1/auth/oauth/google/callback` |
| 필요 Scope | `openid`, `email`, `profile` |
| 환경변수 | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |

### 4.2 플로우

```
클라이언트              서버 (API Route)         Google OAuth         DB
    │                        │                       │                │
    │── GET /auth/oauth/   ─▶│                       │                │
    │   google              │ 302 Redirect           │                │
    │                        │──▶ accounts.google.com/o/oauth2/auth   │
    │                        │    ?client_id=...                      │
    │                        │    &redirect_uri=...                   │
    │                        │    &scope=openid,email,profile         │
    │                        │    &state=random_csrf_token            │
    │                        │                       │                │
    │ [사용자가 Google        │                       │                │
    │  로그인 동의]           │                       │                │
    │                        │                       │                │
    │                        │◀── code, state ───────│                │
    │                        │    (Callback URL로 리다이렉트)         │
    │                        │                       │                │
    │                        │── POST /token ────────▶│               │
    │                        │   { code, client_id,  │                │
    │                        │     client_secret,    │                │
    │                        │     redirect_uri }    │                │
    │                        │◀── access_token ──────│                │
    │                        │                       │                │
    │                        │── GET /userinfo ──────▶│               │
    │                        │◀── { sub, email,      │                │
    │                        │     name, picture }   │                │
    │                        │                       │                │
    │                        │── SELECT FROM users ────────────────▶ │
    │                        │   WHERE email = ?                     │
    │                        │◀── (있으면) 기존 user ──────────────── │
    │                        │   (없으면) INSERT new user ─────────▶ │
    │                        │           { email, name,             │
    │                        │             avatar_url,              │
    │                        │             provider='google' }      │
    │                        │                                      │
    │                        │ jwt.sign(payload, secret)            │
    │◀── 302 → /dashboard ──│                                      │
    │    Set-Cookie: JWT    │                                      │
```

---

## 5. 미들웨어: JWT 검증

API Route에서 인증이 필요한 엔드포인트에 공통 적용.

### 5.1 검증 흐름

```
요청 수신
    │
    ├── Cookie 또는 Authorization 헤더에서 토큰 추출
    │
    ├── jwt.verify(token, JWT_SECRET)
    │       ├── 성공: payload 반환 → req.user 에 저장 → 다음 핸들러
    │       ├── TokenExpiredError: 401 { code: "TOKEN_EXPIRED" }
    │       └── JsonWebTokenError: 401 { code: "INVALID_TOKEN" }
    │
    └── 토큰 없음: 401 { code: "UNAUTHORIZED" }
```

### 5.2 관리자 권한 검증

```
JWT 검증 통과
    │
    ├── req.user.role === 'admin'
    │       ├── 맞음: 다음 핸들러
    │       └── 아님: 403 { code: "FORBIDDEN" }
```

### 5.3 리소스 소유권 검증 (프로젝트, 댓글 등)

```
JWT 검증 통과
    │
    ├── DB에서 리소스 조회
    ├── resource.user_id === req.user.sub
    │       ├── 맞음: 다음 핸들러
    │       └── 아님: 403 { code: "FORBIDDEN" }
```

---

## 6. 환경변수

| 변수명 | 예시 값 | 설명 |
|--------|---------|------|
| `JWT_SECRET` | `your-256-bit-secret` | JWT 서명 비밀키 (최소 32자, 무작위 생성 권장) |
| `JWT_EXPIRES_IN` | `24h` | 토큰 유효 기간 |
| `GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | Google OAuth 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxx` | Google OAuth 클라이언트 시크릿 |
| `GOOGLE_REDIRECT_URI` | `https://{도메인}/api/v1/auth/oauth/google/callback` | OAuth 콜백 URL |
| `COOKIE_DOMAIN` | `vibefund.com` | 프로덕션 쿠키 도메인 |

> 모든 비밀 값은 `.env.local` (로컬) 또는 Vercel 환경 변수 (배포)에 저장. 절대 Git에 커밋 금지.

---

## 7. 보안 체크리스트

| 항목 | 구현 방법 |
|------|-----------|
| 비밀번호 평문 저장 금지 | bcrypt 해싱 (rounds=12) |
| XSS 방어 (토큰 탈취) | HttpOnly Cookie 사용 |
| CSRF 방어 | SameSite=Strict 쿠키 설정, OAuth state 파라미터 |
| 브루트포스 방어 | 로그인 실패 시 동일 에러 메시지 (`INVALID_CREDENTIALS`), 추후 Rate Limiting 도입 |
| HTTPS 강제 | Vercel 기본 적용 (로컬 개발만 HTTP 허용) |
| JWT 비밀키 보안 | 최소 32자 무작위 문자열, Vercel 환경 변수 등 배포 시크릿 관리 |
| SQL Injection 방어 | Supabase Client 파라미터 바인딩 사용 (직접 쿼리 문자열 조합 금지) |
| iframe XSS 방어 | `sandbox="allow-scripts allow-same-origin"` 속성 적용 |

---

## 8. 추후 개선 사항 (MVP 이후)

| 항목 | 설명 |
|------|------|
| Refresh Token | Access Token 만료 시 자동 갱신. DB에 refresh_tokens 테이블 추가 |
| Rate Limiting | 로그인·회원가입 API에 IP 기반 요청 제한 |
| 이메일 인증 | 회원가입 후 이메일 확인 링크 발송 |
| 비밀번호 재설정 | 이메일 기반 비밀번호 리셋 플로우 |
| 다중 OAuth | GitHub, Kakao 등 추가 제공자 연동 |

---

*작성일: 2025-02-20 | 기술_스택·기능_요구사항(F-001~F-002) 기준*
