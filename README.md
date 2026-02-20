# VibeFund

노코드 창업자를 위한 **웹서비스 전용 검증형 펀딩 플랫폼**입니다.

- **리포지터리**: [https://github.com/ccivlcid/vibefund](https://github.com/ccivlcid/vibefund)
- **클론**: `git clone https://github.com/ccivlcid/vibefund.git`

## 문서

프로젝트 요구사항·아키텍처·API·운영 가이드는 **[docs/](docs/)** 폴더를 참고하세요.

- [문서 목차](docs/README.md)
- [PRD (제품 요구사항)](docs/prd.md)
- [모노레포 구조](docs/01_아키텍처/모노레포_구조.md)
- [API 명세 개요](docs/02_기술정보/API_명세_개요.md)

## 기술 스택 (요약)

- **모노레포**: pnpm workspace, Turborepo
- **Frontend**: Next.js, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase (PostgreSQL)
- **CI/CD**: Vercel Git 연동
- **호스팅**: Vercel

결제(Stripe)는 MVP 1차 범위 제외, 추후 도입 예정입니다.
