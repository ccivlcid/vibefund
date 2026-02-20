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

## 2. 관계 요약

```
User 1 ──── N Project   (제작자)
User 1 ──── N Pledge    (후원자)
Project 1 ──── 1 Funding
Project 1 ──── N Reward
Project 1 ──── N Pledge
Project 1 ──── N Comment
Project 1 ──── N Update
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

---
*작성일: 2025-02-20 | 보완: 2025-02-20*
