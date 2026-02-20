# VibeFund 스킬 (Skills)

AI 에이전트가 **특정 작업 시 자동으로 참고**하는 전문 지식 파일입니다.  
작업 유형에 맞는 스킬이 있으면 해당 SKILL.md를 우선 적용합니다.

---

## 스킬 목록

| 스킬 | 경로 | 언제 사용 |
|------|------|-----------|
| **development-patterns** | [development-patterns/SKILL.md](./development-patterns/SKILL.md) | 아키텍처 설계, 리팩터링, 기능 구현, 개발패턴·코딩 컨벤션 질문 시 |

---

## 스킬 추가 방법

- `.cursor/skills/<이름>/SKILL.md` 생성
- frontmatter에 `name`, `description` 명시
- "언제 사용할지", "어떤 절차를 따를지"를 문서에 정리

자세한 개념은 [하니스 엔지니어링](../../docs/06_참고자료/하니스_엔지니어링.md) 참고.
