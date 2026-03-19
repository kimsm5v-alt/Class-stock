# Class-Stock 문서 가이드

> **버전:** MVP v1.0
> **최종 수정일:** 2026.03.17

---

## 문서 구조

| # | 파일 | 역할 |
|---|---|---|
| 01 | [01-PRD.md](./01-PRD.md) | 뭘 만드는지, 왜 만드는지 |
| 02 | [02-SRS.md](./02-SRS.md) | 기능/비기능 요구사항 상세 |
| 03 | [03-FSD.md](./03-FSD.md) | 화면별 구현 스펙 + 22스텝 작업 순서 |
| 04 | [04-IA.md](./04-IA.md) | 화면 흐름 + 상태별 행동 매트릭스 + 용어 정의 |
| 05 | [05-migration.sql](./05-migration.sql) | Supabase에 바로 실행 가능한 SQL (테이블 6개 + RPC 3개 + RLS + 인덱스) |
| 06 | [06-SETUP-GUIDE.md](./06-SETUP-GUIDE.md) | 프로젝트 초기화부터 Vercel 배포까지 단계별 가이드 |
| 07 | [07-SUPABASE-SETUP.md](./07-SUPABASE-SETUP.md) | Supabase 프로젝트 설정 및 환경 변수 가이드 |
| 08 | [08-DESIGN-SYSTEM.md](./08-DESIGN-SYSTEM.md) | 디자인 시스템 (컬러, 타이포, 컴포넌트 스타일) |
| 참고 | [class-stock-wireframe-v3 (2).html](<./class-stock-wireframe-v3 (2).html>) | 디자인 레퍼런스 v3 (라이트 모드) |
| 참고 | [class-stock-report-wireframe-v2.html](./class-stock-report-wireframe-v2.html) | 교사 리포트 와이어프레임 v2 |

---

## 문서 읽는 순서

```
1. PRD.md             → 프로젝트 개요 파악
2. SRS.md             → 기능 요구사항 상세 확인
3. IA.md              → 화면 흐름 및 상태 전이 이해
4. FSD.md             → 화면별 구현 스펙 확인
5. migration.sql      → DB 스키마 확인
6. SETUP-GUIDE.md     → 개발 환경 세팅
7. SUPABASE-SETUP.md  → Supabase 설정
8. DESIGN-SYSTEM.md   → 디자인 시스템 (모든 화면 기준)
```

---

## 핵심 용어 정리

| 용어 | 설명 |
|---|---|
| 장 개시(수업 시작) | 교사가 수업을 시작하여 학생 화면을 활성화하는 행위 |
| 거래 오픈 | 교사가 학생의 매수/매도를 허용하는 행위 |
| 거래 마감 | 거래 오픈을 닫는 행위 (자동 또는 수동) |
| 장 마감 | 수업 전체를 종료하고 정산 단계로 넘어가는 행위 |
| 정산 | 교사가 핵심 키워드 3개를 선택하고 포인트를 계산하는 행위 |

---

## 세션 상태 흐름

```
waiting ──(장 개시)──→ active ──(거래 오픈)──→ trading ──(거래 마감)──→ active
                         │                                               │
                         │                       (장 마감 + 핵심 선택)    │
                         │                                               ▼
                         └─────────────────────────────────────────→ settling ──(정산 완료)──→ closed
```

---

## 기술 스택

| 영역 | 선택 |
|---|---|
| 프레임워크 | React 18 + TypeScript + Vite |
| 스타일링 | Tailwind CSS (라이트 모드 전용) |
| 상태관리 | Zustand |
| BaaS | Supabase (Auth + Database + Realtime) |
| 배포 | Vercel |

---

## Claude Code 작업 시 참고

1. **PRD/SRS** → 요구사항 확인
2. **IA** → 화면 전이 및 상태별 가능 행동 확인
3. **FSD** → 구현 스펙 및 작업 순서 확인
4. **migration.sql** → DB 스키마 및 RPC 함수 확인
5. **DESIGN-SYSTEM.md** → 모든 화면의 디자인 기준 (필수 참고)

문서 간 용어가 통일되어 있으므로, 동일한 용어로 코드를 작성할 것.

**디자인 시스템 핵심:**
- 라이트 모드 전용 (다크 모드 미지원)
- 페이지 배경: `cs-bg` (#F7F7FA)
- 카드 배경: `cs-surface` (#FFFFFF)
- 폰트: Outfit(숫자), DM Mono(코드), Noto Sans KR(본문)
