# MCP 연결 가이드 (VibeFund)

AI 에이전트가 **외부 도구**를 쓰려면 MCP(Model Context Protocol) 서버를 연결합니다.  
Cursor: **설정 → Features → MCP** 에서 서버 추가.

---

## 권장 MCP (프로젝트 활용)

| MCP | 용도 |
|-----|------|
| **Supabase** | DB 조회·스키마 확인, 로그·에러 디버깅 |
| **Vercel** | 배포 상태·빌드 로그·런타임 로그 확인 |
| **Browser (Chrome DevTools)** | 웹 앱 UI 테스트, E2E 시나리오 검증 |
| (선택) **Git** | 브랜치·커밋·PR 컨텍스트 제공 |

---

## 설정 후 확인

- Cursor에서 MCP 서버가 "Connected" 상태인지 확인
- 필요한 도구만 활성화해 토큰·비용 관리

상세 개념: [하니스_엔지니어링.md](../docs/06_참고자료/하니스_엔지니어링.md)
