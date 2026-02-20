# VibeFund — AI 에이전트 컨텍스트

이 파일은 AI(Cursor/Claude 등)가 프로젝트를 이해하고 일관된 규칙으로 작업할 때 참고하는 **컨텍스트 문서**입니다.

---

## 1. 프로젝트 개요

- **이름**: VibeFund
- **목적**: 노코드 창업자를 위한 **웹서비스 전용 검증형 펀딩 플랫폼**
- **특징**: 실제 서비스 체험 → 후원 구조, MVP 1차에는 결제 미포함(추후 Stripe 도입 예정)

---

## 2. 리포지터리 구조 (모노레포)

```
vibeFund/
├── apps/
│   └── web/           # Next.js (프론트 + API Routes), Vercel 배포 대상
├── packages/
│   └── shared/        # 공용 타입·상수·유틸 (@vibefund/shared)
├── docs/              # 요구사항·아키텍처·API·운영 문서
├── package.json       # 루트 workspace
├── pnpm-workspace.yaml
├── turbo.json         # Turborepo 파이프라인
└── CLAUDE.md          # 본 컨텍스트 파일
```

- **빌드**: 루트에서 `pnpm install`, `pnpm build` (또는 `turbo run build`)
- **실행**: `pnpm dev` 또는 `apps/web`에서 Next.js dev 서버

---

## 3. 기술 스택

| 영역 | 기술 |
|------|------|
| 모노레포 | pnpm workspace, Turborepo |
| Frontend | Next.js, Tailwind CSS |
| Backend | Next.js API Routes, Supabase (PostgreSQL) |
| 인증 | Supabase Auth 미사용 → 백엔드 인증 API (JWT/세션) |
| CI/CD | Vercel Git 연동 배포 (빌드·테스트·배포) |
| 호스팅 | Vercel (FE), Supabase (DB) |

---

## 4. 규칙·패턴

- **언어**: 사용자 요청이 없으면 **한국어**로 응답.
- **코드**: DRY, 가독성 우선. 주석·타입 명시. 버그 없는 예시 코드 제공.
- **아키텍처**: API → 서비스 → 데이터 계층 유지. 비즈니스 로직은 인프라와 분리.
- **문서**: 상세는 `docs/` 참고 — [문서 목차](docs/README.md), [모노레포 구조](docs/01_아키텍처/모노레포_구조.md), [API 명세](docs/02_기술정보/API_명세_개요.md).
- **환경 변수·비밀**: `.env`(로컬) / Vercel 환경 변수(배포)에만 저장, Git 커밋 금지.

---

## 5. 개발 패턴 참고

아키텍처·리팩터링·기능 구현 시 `.cursor/skills/development-patterns/SKILL.md` 및 [하니스 엔지니어링](docs/06_참고자료/하니스_엔지니어링.md)을 참고한다.

---

*프로젝트 하니스 적용: 컨텍스트 파일(CLAUDE.md) — 2025-02-20*
