# VibeFund ERD 개요

## 1. 주요 엔티티 (PRD 기능 기준)

| 엔티티 | 설명 |
|--------|------|
| **User** | 회원 (이메일, OAuth, 프로필, role: user/admin — 관리자 페이지 구분) |
| **Project** | 펀딩 프로젝트 (제목, 설명, URL, 카테고리, 썸네일, 상태) |
| **Funding** | 펀딩 설정 (목표 금액, 마감일, 최소 후원액) |
| **Reward** | 리워드 (베타 접근권, 평생 이용권 등) |
| **Pledge** | 후원/결제 내역 (추후 결제 도입 시 사용, 현재는 생략 가능) |
| **Comment** | 댓글 (사용자 댓글, 제작자 답변) |
| **Update** | 프로젝트 업데이트 게시글 |
| **AiBoardMember** | AI 이사회 멤버 풀 (버핏, 잡스, Karpathy 등 유명인 페르소나, 운영자 추가 가능) |
| **ProjectAiBoardSelection** | 프로젝트별 유저가 선택한 “포함” AI 멤버 (제외 = 선택 안 함) |
| **AiBoardReport** | 프로젝트별 AI 이사회 심사 결과 (종합 점수, 등급, 강점/리스크/개선항목) |
| **AiBoardReportScore** | 심사 결과 내 멤버별 점수·피드백 (멤버 추가 시 확장 대응) |
| **ProjectVote** | 프로젝트 따봉(추천) up / 비추(비추천) down, 유저당 1표 |

## 2. 관계 요약

```
User 1 ──── N Project   (제작자)
User 1 ──── N Pledge    (후원자)
Project 1 ──── 1 Funding
Project 1 ──── N Reward
Project 1 ──── N Pledge
Project 1 ──── N Comment
Project 1 ──── N Update

AiBoardMember 1 ──── N ProjectAiBoardSelection  (멤버 풀 → 프로젝트별 포함 선택)
Project 1 ──── N ProjectAiBoardSelection        (프로젝트별 “포함”할 멤버)
Project 1 ──── N AiBoardReport                  (프로젝트별 심사 결과, 이력 가능)
AiBoardReport 1 ──── N AiBoardReportScore       (심사별 멤버 점수·피드백)
AiBoardMember 1 ──── N AiBoardReportScore       (멤버)

User 1 ──── N ProjectVote    (투표한 유저)
Project 1 ──── N ProjectVote (프로젝트별 따봉/비추)
```

## 3. ERD 다이어그램

- 상세 ERD는 본 폴더에 `erd.png` 또는 `erd.drawio` 등으로 추가 예정

## 4. 보완: 카디널리티·비고

| 관계 | 비고 |
|------|------|
| User ↔ Project | 한 사용자 다수 프로젝트 소유 |
| Project ↔ Funding | 1:1 (프로젝트당 펀딩 설정 1개) |
| Project ↔ Pledge | 한 프로젝트에 다수 후원 |
| Comment parent_id | self-reference로 대댓글(제작자 답변) 표현 |
| Project ↔ ProjectAiBoardSelection | 등록 유저가 “포함”한 멤버만 row 존재, 제외 멤버는 row 없음 |
| Project ↔ AiBoardReport | 한 프로젝트에 여러 회차 심사 가능(이력), 최신 1건 활용 권장 |
| AiBoardReport ↔ AiBoardReportScore | 해당 심사에 참여한 멤버별 1 row |
| Project ↔ ProjectVote | 프로젝트당 다수 투표, (project_id, user_id) unique → 유저당 1표 |

---
*작성일: 2025-02-20 | 보완: 2025-02-20 (AI 이사회 엔티티 추가, project_votes 추가)*
