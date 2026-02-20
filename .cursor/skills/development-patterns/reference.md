# 개발 패턴 상세 참조 (Reference)

SKILL.md에서 언급한 패턴의 적용 예시와 주의사항을 정리한다.

---

## 아키텍처 예시 (레이어드)

```
api/
  routes/          # HTTP 요청 매핑, DTO 변환
  middleware/      # 인증, 로깅, 에러 포맷
services/          # 유스케이스, 트랜잭션 경계
domain/            # (선택) 엔티티, 도메인 서비스
repositories/      # 데이터 접근 추상화
infrastructure/    # DB 클라이언트, 외부 API 어댑터
```

- **호출 방향**: routes → services → repositories. domain은 services에서 사용.
- **역참조 금지**: repositories가 services를 import하지 않음.

---

## 리포지토리 패턴 예시

**인터페이스 (도메인/포트 측)**:

```typescript
// 프로젝트가 TypeScript인 경우 예시
interface ProjectRepository {
  findById(id: string): Promise<Project | null>;
  save(project: Project): Promise<void>;
  findByOwnerId(ownerId: string): Promise<Project[]>;
}
```

**구현 (인프라 측)**: DB 쿼리·ORM 호출을 여기서만 수행.

- 서비스는 `ProjectRepository` 타입만 의존.
- 테스트 시 메모리/목 구현으로 교체 가능.

---

## 서비스 계층 예시

- **한 메서드 = 한 유스케이스**: 예) `createFunding(projectId, amount, userId)`.
- **트랜잭션**: 이 메서드 안에서 DB 트랜잭션 시작·커밋·롤백 처리.
- **도메인 규칙**: 금액 검증, 목표 달성 여부 등은 서비스 또는 도메인 모델에서 처리.

---

## 에러 응답 형식 (일관성)

예시:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "amount must be positive",
    "details": { "field": "amount" }
  }
}
```

- 4xx/5xx와 매핑된 코드 규칙을 정해 두고, 모든 API가 동일한 구조를 사용.

---

## 프론트엔드 (React 예시)

- **컴포넌트**: Presentational / Container 구분이 유용할 수 있음. 훅으로 로직 분리.
- **API 호출**: `hooks/useProject.ts` 등으로 캡슐화, 로딩/에러 상태 통일.
- **라우팅**: 라우트 상수·경로를 한 파일에서 관리.

---

이 문서는 필요 시 확장한다. 프로젝트 스택(예: Next.js, NestJS, Python FastAPI)에 맞춰 구체 예제를 추가하면 좋다.
