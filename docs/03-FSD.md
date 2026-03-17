# Class-Stock 기능명세서

> **버전:** MVP v1.0
> **작성일:** 2026.03.17
> **용도:** Claude Code 개발 작업 지시서 — 화면별 컴포넌트/동작/데이터 상세

---

## 1. 프로젝트 구조

```
class-stock/
├── public/
├── src/
│   ├── main.tsx
│   ├── App.tsx                    # 라우팅
│   ├── lib/
│   │   ├── supabase.ts           # Supabase 클라이언트 초기화
│   │   └── types.ts              # DB 타입 정의
│   ├── stores/
│   │   ├── authStore.ts          # 교사 인증 상태
│   │   └── sessionStore.ts       # 현재 수업 세션 상태
│   ├── hooks/
│   │   ├── useRealtimeSession.ts # 세션 상태 실시간 구독
│   │   ├── useRealtimeStocks.ts  # 종목 공개 실시간 구독
│   │   ├── useRealtimeStudents.ts# 학생 접속 실시간 구독
│   │   └── useRealtimeHoldings.ts# 매수 현황 실시간 구독
│   ├── pages/
│   │   ├── Landing.tsx           # SCR-01
│   │   ├── teacher/
│   │   │   ├── Auth.tsx          # SCR-02
│   │   │   ├── Dashboard.tsx     # SCR-03
│   │   │   ├── CreateSession.tsx # SCR-04
│   │   │   ├── WaitingRoom.tsx   # SCR-05
│   │   │   ├── LiveSession.tsx   # SCR-06
│   │   │   ├── Settlement.tsx    # SCR-07
│   │   │   └── Report.tsx        # SCR-08
│   │   └── student/
│   │       ├── JoinSession.tsx   # SCR-09
│   │       ├── Waiting.tsx       # SCR-10
│   │       ├── LiveTrading.tsx   # SCR-11
│   │       └── Result.tsx        # SCR-12
│   └── components/
│       ├── common/
│       │   ├── CountdownTimer.tsx
│       │   ├── QRCode.tsx
│       │   └── StatusBadge.tsx
│       ├── teacher/
│       │   ├── StockControlList.tsx   # 종목 관리 + 공개 버튼
│       │   ├── TradeControl.tsx       # 거래 오픈/마감 컨트롤
│       │   ├── BuyRateChart.tsx       # 매수율 바 차트
│       │   └── SessionStatCards.tsx   # 통계 카드
│       └── student/
│           ├── PortfolioHeader.tsx    # 수익률 헤더
│           ├── StockCard.tsx          # 종목 카드 (찜/매수/매도)
│           ├── TradeStatusBanner.tsx  # 거래 상태 배너
│           └── BalanceBar.tsx         # 하단 잔고 바
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    # 테이블 생성 + RPC 함수
├── tailwind.config.ts
├── vite.config.ts
├── package.json
└── tsconfig.json
```

---

## 2. 라우팅

```typescript
// App.tsx 라우팅 구조
/                          → Landing (역할 선택)
/teacher/auth              → Auth (회원가입/로그인)
/teacher/dashboard         → Dashboard (수업 목록) [교사 인증 필요]
/teacher/create            → CreateSession [교사 인증 필요]
/teacher/session/:id/wait  → WaitingRoom [교사 인증 필요]
/teacher/session/:id/live  → LiveSession [교사 인증 필요]
/teacher/session/:id/settle→ Settlement [교사 인증 필요]
/teacher/session/:id/report→ Report [교사 인증 필요]
/join                      → JoinSession (수업 코드 입력)
/session/:id/waiting       → Waiting (학생 대기)
/session/:id/live          → LiveTrading (학생 수업 진행)
/session/:id/result        → Result (학생 정산 결과)
```

---

## 3. 화면별 기능 명세

### SCR-01: 랜딩 / 역할 선택

**경로:** `/`

| 요소 | 동작 |
|---|---|
| "교사로 시작" 버튼 | → `/teacher/auth` |
| "학생으로 참여" 버튼 | → `/join` |
| 로고 + 서비스 한 줄 설명 | "수업이 곧 투자다" 등 |

디자인: 다크 모드. 중앙 정렬. 두 개의 카드형 버튼.

---

### SCR-02: 교사 회원가입/로그인

**경로:** `/teacher/auth`

| 요소 | 동작 |
|---|---|
| 탭: 로그인 / 회원가입 | 탭 전환 |
| 로그인: 이메일 + 비밀번호 | supabase.auth.signInWithPassword() |
| 회원가입: 이름 + 이메일 + 비밀번호 | supabase.auth.signUp() + teachers 테이블 INSERT |
| 에러 표시 | 이메일 중복, 비밀번호 규칙 등 인라인 에러 |
| 로그인 성공 시 | → `/teacher/dashboard` |

---

### SCR-03: 교사 대시보드 (수업 목록)

**경로:** `/teacher/dashboard`

| 요소 | 동작 |
|---|---|
| "새 수업 만들기" 버튼 | → `/teacher/create` |
| 수업 이력 리스트 | sessions 테이블에서 teacher_id로 조회. 최신순 정렬 |
| 각 수업 카드 | 학급명, 과목, 단원, 날짜, 상태 배지(진행중/종료) 표시 |
| 종료된 수업 클릭 | → `/teacher/session/:id/report` |
| 진행중 수업 클릭 | → 해당 상태의 화면으로 이동 |

---

### SCR-04: 수업 개설

**경로:** `/teacher/create`

| 요소 | 동작 |
|---|---|
| 학급명 입력 | 텍스트. 필수. 예: "3학년 2반" |
| 과목 입력 | 텍스트. 필수. 예: "과학" |
| 단원명 입력 | 텍스트. 필수. 예: "세포의 에너지" |
| 키워드 입력 영역 | 동적 추가/삭제. 최소 3개, 최대 7개. 각 최대 20자 |
| 히든 종목 토글 | 각 키워드 옆 🔒 아이콘 토글. 최대 2개까지 |
| "수업 만들기" 버튼 | sessions INSERT + stocks INSERT → `/teacher/session/:id/wait` |
| 수업 코드 생성 로직 | 영문 대문자 + 숫자 6자리 랜덤. 기존 active 세션과 중복 검증 |

---

### SCR-05: 수업 대기실 (교사)

**경로:** `/teacher/session/:id/wait`

| 요소 | 동작 |
|---|---|
| QR 코드 | 접속 URL (`{도메인}/join?code={join_code}`) 기반 QR. 크게 표시 |
| 수업 코드 텍스트 | 큰 폰트로 6자리 코드 표시 |
| 접속 학생 수 | "접속 학생: 28명" 실시간 카운트 (useRealtimeStudents) |
| 접속 학생 닉네임 리스트 | 접속 순서대로 닉네임 표시. 새 학생 입장 시 애니메이션 |
| "장 개시(수업 시작)" 버튼 | sessions.status → 'active' → `/teacher/session/:id/live` |
| 수업 정보 표시 | 학급명, 과목, 단원, 키워드 수 |

---

### SCR-06: 교사 수업 진행

**경로:** `/teacher/session/:id/live`

**레이아웃:** 좌측 320px 컨트롤 패널 + 우측 대시보드 (반응형: 모바일에서는 탭 전환)

#### 좌측: 컨트롤 패널

| 컴포넌트 | 요소 | 동작 |
|---|---|---|
| **수업 정보** | 학급명, 접속 학생 수, 수업 상태 배지 | 실시간 업데이트 |
| **StockControlList** | 종목 리스트 | 각 종목: 키워드명 (미공개면 "???") + "공개" 버튼 + 찜하기 수 |
| | "공개" 버튼 | stocks.is_revealed → true. 이미 공개된 종목은 버튼 비활성 |
| | 찜하기 수 | 실시간 갱신. "☆ 12명" 형태 |
| | 히든 종목 표시 | 🔒 아이콘 + "HIDDEN" 태그 |
| **TradeControl** | 거래 시간 선택 | 30초/60초/90초/120초 드롭다운. 기본 60초 |
| | "거래 오픈" 버튼 | session.status → 'trading' + trade_end_at 설정 |
| | 카운트다운 타이머 | 거래 중일 때 표시. trade_end_at까지 남은 시간 |
| | "거래 마감" 버튼 | 거래 중일 때만 표시. 수동 조기 마감 |
| | "장 마감 → 정산" 버튼 | → `/teacher/session/:id/settle` |

#### 우측: 대시보드

| 컴포넌트 | 요소 | 동작 |
|---|---|---|
| **SessionStatCards** | 카드 1: 총 거래 건수 | trades 테이블 COUNT. 실시간 |
| | 카드 2: 참여 학생 수 | 거래 1회 이상 학생 수 / 전체 학생 수 |
| | 카드 3: 평균 투자 포인트 | 학생 1인당 평균 투자 금액 |
| **BuyRateChart** | 종목별 매수율 바 차트 | (해당 종목 매수 학생 수 / 전체 학생 수) × 100. 높은 순 정렬. 색상: 70%↑ 빨강, 30~70% 노랑, 30%↓ 회색 |

---

### SCR-07: 정산 화면 (교사)

**경로:** `/teacher/session/:id/settle`

| 요소 | 동작 |
|---|---|
| 전체 종목 리스트 (체크박스) | 각 종목명 + 최종 매수율 표시 |
| 핵심 키워드 선택 | 체크박스로 정확히 3개 선택. 3개 미만/초과 시 "정산" 버튼 비활성 |
| "정산 실행" 버튼 | 선택된 3개 종목의 is_core → true. 정산 로직 실행 (RPC 호출). session.status → 'closed' |
| 정산 로직 | 핵심 종목 보유: holding.amount × 3. 비핵심 종목 보유: holding.amount × 0.5. 결과를 students.balance에 반영 |
| 정산 완료 후 | → `/teacher/session/:id/report` |

**정산 RPC 함수 (Supabase Database Function):**
```sql
-- settle_session(session_id uuid, core_stock_ids uuid[])
-- 1. 선택된 종목 is_core = true
-- 2. holdings에서 해당 session의 모든 보유 계산
-- 3. 핵심 종목 holding → amount * 3
-- 4. 비핵심 종목 holding → amount * 0.5 (내림)
-- 5. 학생별 최종 balance = 남은 잔고 + 정산된 보유 총합
-- 6. session.status = 'closed'
```

---

### SCR-08: 학급 리포트 (교사)

**경로:** `/teacher/session/:id/report`

**레이아웃:** 세로 스크롤 단일 페이지. 5개 섹션 순서대로 배치. 상단에 수업 기본 정보 헤더.

#### 헤더: 수업 기본 정보

| 요소 | 데이터 |
|---|---|
| 수업 정보 | 학급명, 과목, 단원, 일시 |
| 참여 학생 수 | 거래 참여 / 전체 접속 (예: "26/28명") |

#### 섹션 ①: 수업 한 눈에

3개의 핵심 지표 카드를 가로 배치.

| 카드 | 데이터 | 산출 방식 |
|---|---|---|
| 학급 평균 정확률 | 큰 숫자 + % | 각 학생의 (핵심 종목 투자 포인트 / 전체 투자 포인트) 평균 × 100. 투자 0인 학생 제외 |
| 참여율 | 큰 숫자 + % | (거래 1회 이상 학생 수 / 전체 접속 학생 수) × 100 |
| 총 거래 건수 | 큰 숫자 | trades 테이블에서 해당 session의 총 COUNT |

#### 섹션 ②: 개념별 분석 (인지-확신 갭)

종목별 **찜하기율과 매수율을 나란히 비교**하는 이중 바 차트.

| 요소 | 데이터 | 산출 방식 |
|---|---|---|
| 이중 바 차트 | 종목별 2개 바 (찜하기율 / 매수율) | 찜하기율 = (해당 종목 찜한 학생 수 / 전체 학생 수) × 100. 매수율 = (해당 종목 매수 학생 수 / 전체 학생 수) × 100 |
| 인지-확신 갭 태그 | 찜하기율 - 매수율 > 20%p인 종목에 "⚠️ 갭 발생" 태그 | 갭이 클수록 "중요한 건 알겠지만 확신이 없는" 상태 |
| 핵심 종목 표시 | 핵심으로 선택된 3개 종목에 ★ 아이콘 | stocks.is_core = true |
| 히든 종목 표시 | 히든이었던 종목에 🔒 아이콘 | stocks.is_hidden = true |

갭 해석 가이드 (차트 하단에 표시):
- **찜↑ 매수↑**: 잘 이해한 개념
- **찜↑ 매수↓**: 인지-확신 갭 — 보충 설명 또는 다른 각도의 설명 필요
- **찜↓ 매수↓**: 완전히 놓친 개념
- **찜↓ 매수↑**: 소수 학생만 확신을 갖고 투자

#### 섹션 ③: 학급 투자 성향

학급 전체의 투자 분포 패턴을 분류하여 표시.

| 요소 | 데이터 | 산출 방식 |
|---|---|---|
| 성향 분류 배지 | "몰빵형" / "분산형" / "양극화형" 중 하나 | 아래 로직 참조 |
| 도넛 차트 | 종목별 투자 포인트 비율 | 전체 학생의 종목별 투자 총합 비율 |
| 해석 텍스트 | 성향별 맞춤 코멘트 | 아래 참조 |

성향 분류 로직:
```
1. 종목별 투자 비율 계산 (종목 투자 총합 / 전체 투자 총합)
2. 최대 비율 종목의 비율이 60% 이상 → "몰빵형"
3. 상위 2개 종목의 비율 차이가 10%p 이내이고 둘 다 30% 이상 → "양극화형"
4. 그 외 → "분산형"
```

성향별 코멘트:
- **몰빵형**: "학생들이 [{종목명}]에 집중 투자했습니다. 나머지 개념의 중요성을 연결지어 설명해보세요."
- **분산형**: "투자가 고르게 분산되었습니다. 학급 평균 정확률과 함께 보면 전반적 이해도를 판단할 수 있습니다."
- **양극화형**: "[{종목A}]와 [{종목B}] 사이에서 의견이 갈렸습니다. 두 개념의 관계를 비교하는 토론 활동을 권장합니다."

추가 인사이트:
| 요소 | 데이터 |
|---|---|
| 종목 공개 순서 vs 매수율 | 먼저 공개된 종목과 나중에 공개된 종목의 평균 매수율 비교. "이 반은 나중에 공개된 종목의 매수율이 더 높습니다" 등 |
| 히든 종목 도전율 | ???에 투자한 학생 수 / 전체 학생 수. "학생 {N}%가 히든 종목에 도전했습니다" |

#### 섹션 ④: 놓친 개념 알림

핵심 키워드 3개 중 매수율이 30% 미만인 종목이 있으면 강조 표시.

| 요소 | 조건 | 표시 |
|---|---|---|
| 알림 카드 (경고 스타일) | is_core = true AND 매수율 < 30% | "⚠️ **{종목명}** — 핵심 개념이지만 매수율이 {N}%입니다. 다음 수업에서 이 개념을 다시 짚어주세요." |
| 인지-확신 갭 부가 정보 | 해당 종목의 찜하기율도 함께 표시 | "찜하기율 {N}% → 학생들이 중요성은 인식했지만 확신하지 못했습니다" 또는 "찜하기율 {N}% → 중요성 자체를 인식하지 못했습니다" |
| 알림 없는 경우 | 모든 핵심 종목 매수율 ≥ 30% | "✅ 핵심 개념이 모두 잘 전달되었습니다" |

#### 섹션 ⑤: 수업 추이 (2회차부터 표시)

같은 교사의 과거 수업 데이터와 비교하는 추이 차트.

| 요소 | 데이터 | 산출 방식 |
|---|---|---|
| 정확률 추이 라인 차트 | 최근 5~10회 수업의 학급 평균 정확률 | sessions 테이블에서 teacher_id + status='closed' 조건으로 최신순 |
| 참여율 추이 라인 차트 | 최근 5~10회 수업의 참여율 | 동일 |
| 이번 수업 포인트 | 현재 수업 위치를 차트에서 강조 | 마지막 데이터 포인트 하이라이트 |
| 변화 텍스트 | 직전 수업 대비 변화 | "정확률: 지난 수업 대비 +12%p ▲" 또는 "참여율: 지난 수업 대비 -5%p ▼" |

1회차 수업인 경우: "수업 데이터가 쌓이면 추이를 확인할 수 있습니다" 안내 텍스트만 표시.

---

### SCR-09: 학생 입장

**경로:** `/join` (쿼리 파라미터로 code 전달 가능: `/join?code=AB3K7F`)

| 요소 | 동작 |
|---|---|
| 수업 코드 입력 (6자리) | 대문자 자동 변환. 입력 완료 시 자동 검증 |
| 코드 검증 | sessions에서 join_code 매칭 + status가 'waiting' 또는 'active' 또는 'trading' |
| 유효하지 않은 코드 | "수업을 찾을 수 없습니다" 에러 표시 |
| 닉네임 입력 | 코드 검증 성공 후 표시. 2~8자. 동일 세션 내 중복 검증 |
| "입장" 버튼 | students 테이블 INSERT (session_id, nickname, balance=10000) → 세션 상태에 따라 라우팅 |
| QR 접속 시 | URL에 code 쿼리 파라미터 포함 → 코드 자동 입력 |

---

### SCR-10: 학생 대기

**경로:** `/session/:id/waiting`

| 요소 | 동작 |
|---|---|
| "교사가 수업을 시작하면 자동으로 넘어갑니다" | 안내 텍스트 |
| 대기 애니메이션 | 로딩 또는 펄스 애니메이션 |
| 세션 상태 구독 | session.status가 'active'로 변경되면 → `/session/:id/live` 자동 이동 |
| 수업 정보 표시 | 학급명, 과목, 단원, 닉네임 |
| 접속 학생 수 | "현재 28명 접속" 실시간 |

---

### SCR-11: 학생 수업 진행

**경로:** `/session/:id/live`

**레이아웃:** 모바일 우선 세로 스크롤. 상단 포트폴리오 → 거래 상태 → 종목 리스트 → 하단 잔고 고정

| 컴포넌트 | 요소 | 동작 |
|---|---|---|
| **PortfolioHeader** | 총 자산 | balance + 모든 holdings amount 합계. 큰 숫자 |
| | 수익률 | (총 자산 - 10000) / 10000 × 100. 양수 빨강, 음수 파랑 |
| **TradeStatusBanner** | 거래 닫힘 상태 | "📋 수업 진행 중 — 관심 종목을 찜해두세요" |
| | 거래 열림 상태 | "🔓 거래 오픈!" + 카운트다운 타이머. 빨간 테두리 펄스 애니메이션 |
| **StockCard** (리스트) | 미공개 종목 | "??? (미공개)" + 찜하기 ☆ 버튼만 |
| | 공개 종목 (미보유) | 키워드명 + 매수율 표시 + 찜하기 ☆ + 매수 버튼 (거래 중만 활성) |
| | 공개 종목 (보유) | 키워드명 + 보유 포인트 배지 + 찜하기 ☆ + 매도/추가매수 버튼 (거래 중만 활성) |
| | 매수 인터랙션 | 매수 버튼 클릭 → 금액 선택 모달 (1,000 / 2,000 / 3,000 / 5,000 / 전액). balance 부족 시 비활성 |
| | 매도 인터랙션 | 매도 버튼 클릭 → 즉시 전액 매도. 확인 팝업 |
| **BalanceBar** (하단 고정) | 좌: 투자 가능 잔고 | balance 표시 |
| | 우: 투자 완료 | holdings 합계 표시 |

**실시간 구독:**
- session.status 변경 → 거래 상태 배너 업데이트, 버튼 활성/비활성
- stocks.is_revealed 변경 → 종목 이름 공개 애니메이션
- session.status = 'settling' 또는 'closed' → `/session/:id/result`로 자동 이동

**매수 금액 선택 모달:**
```
┌──────────────────────────┐
│  #미토콘드리아 매수        │
│                          │
│  ┌──────┐ ┌──────┐      │
│  │1,000 │ │2,000 │      │
│  └──────┘ └──────┘      │
│  ┌──────┐ ┌──────┐      │
│  │3,000 │ │5,000 │      │
│  └──────┘ └──────┘      │
│  ┌──────────────────┐    │
│  │   전액 (5,000pt)  │    │
│  └──────────────────┘    │
│                          │
│  잔고: 5,000pt           │
│  [매수하기]              │
└──────────────────────────┘
```

---

### SCR-12: 학생 정산 결과

**경로:** `/session/:id/result`

| 요소 | 동작 |
|---|---|
| 정산 애니메이션 | 핵심 종목 → 300% 폭등 표시 (숫자 카운트업 + 녹색/빨간 이펙트). 비핵심 종목 → 50% 하락 표시. 순차적으로 하나씩 공개 (1초 간격) |
| 히든 종목 공개 | ??? → 실제 키워드명 전환 애니메이션 + 핵심 여부 표시 |
| 최종 수익률 | 큰 숫자. (최종 balance - 10000) / 10000 × 100 |
| 이해도 예측 정확률 | (핵심 종목 투자 포인트 합 / 전체 투자 포인트 합) × 100 |
| 종목별 결과 리스트 | 각 종목: 키워드명, 핵심 여부 태그, 내 투자 포인트, 정산 후 포인트 |
| "수업 나가기" 버튼 | → `/join` (학생 초기 화면) |

---

## 4. Supabase Database Functions (RPC)

### 4.1 buy_stock

```
함수: buy_stock(p_student_id uuid, p_stock_id uuid, p_amount int)
동작:
  1. students.balance >= p_amount 검증
  2. students.balance -= p_amount
  3. holdings UPSERT (student_id, stock_id): amount += p_amount
  4. trades INSERT (student_id, stock_id, type='buy', amount=p_amount)
  5. 실패 시 롤백
리턴: { success: boolean, new_balance: int }
```

### 4.2 sell_stock

```
함수: sell_stock(p_student_id uuid, p_stock_id uuid)
동작:
  1. holdings에서 해당 보유 amount 조회
  2. students.balance += amount
  3. holdings DELETE (student_id, stock_id)
  4. trades INSERT (student_id, stock_id, type='sell', amount)
리턴: { success: boolean, new_balance: int, sold_amount: int }
```

### 4.3 settle_session

```
함수: settle_session(p_session_id uuid, p_core_stock_ids uuid[])
동작:
  1. stocks에서 p_core_stock_ids에 해당하는 종목 is_core = true
  2. 해당 session의 모든 holdings 조회
  3. 각 holding에 대해:
     - stock이 core이면: settled_amount = amount * 3
     - stock이 core가 아니면: settled_amount = floor(amount * 0.5)
  4. 학생별 최종 balance = 현재 balance + 모든 settled_amount 합계
  5. session.status = 'closed'
리턴: { success: boolean, student_results: [{student_id, nickname, final_balance, accuracy}] }
```

---

## 5. 디자인 시스템 (Tailwind 기반)

### 5.1 색상 토큰

```javascript
// tailwind.config.ts 에 추가
colors: {
  cs: {
    bg:        { primary: '#0D1117', secondary: '#161B22', tertiary: '#1C2333', card: '#1A1F2E' },
    text:      { primary: '#E6EDF3', secondary: '#8B949E', muted: '#484F58' },
    up:        '#FF3B3B',       // 상승/매수 — 빨강
    down:      '#3B82F6',       // 하락/매도 — 파랑
    gold:      '#F5A623',       // 히든/서프라이즈 — 금색
    green:     '#22C55E',       // 성공/접속 — 초록
    border:    '#21262D',
  }
}
```

### 5.2 폰트

- 숫자/코드: `JetBrains Mono` (Google Fonts)
- 본문: `Noto Sans KR` (Google Fonts)

### 5.3 기본 규칙

- 모든 화면 다크 모드 (`bg-cs-bg-primary`)
- 카드: `bg-cs-bg-card rounded-xl border border-cs-border`
- 상승 수치: `text-cs-up`
- 하락 수치: `text-cs-down`
- 모노스페이스 숫자: `font-mono font-bold`
- 학생 화면 최대 너비: `max-w-md mx-auto` (420px)
- 교사 화면 최소 너비: 1024px

---

## 6. Claude Code 작업 순서 권장

MVP 개발을 아래 순서로 진행하는 것을 권장한다.

### Phase 1: 기반 세팅
1. Vite + React + TypeScript + Tailwind 프로젝트 초기화
2. Supabase 프로젝트 연결 + 환경변수 설정
3. DB 마이그레이션 실행 (테이블 + RPC 함수)
4. 라우팅 설정 (React Router)
5. Supabase Auth 연동 (교사 가입/로그인)
6. Zustand 스토어 기본 구조

### Phase 2: 교사 플로우
7. 교사 대시보드 (수업 목록)
8. 수업 개설 (키워드 입력 + 히든 지정 + 코드 생성)
9. 수업 대기실 (QR + 학생 접속 실시간)
10. 수업 진행 — 좌측 컨트롤 (종목 공개 + 거래 컨트롤)
11. 수업 진행 — 우측 대시보드 (매수율 차트 + 통계)
12. 정산 화면 (핵심 키워드 선택 + 정산 RPC)
13. 학급 리포트

### Phase 3: 학생 플로우
14. 학생 입장 (수업 코드 + 닉네임)
15. 학생 대기 화면
16. 학생 수업 진행 — 종목 리스트 + 찜하기
17. 학생 수업 진행 — 매수/매도 (거래 오픈 연동)
18. 학생 정산 결과 (애니메이션 + 수익률)

### Phase 4: 실시간 동기화 + 마감
19. 전체 Realtime 구독 점검 (종목 공개, 거래 상태, 매수율)
20. 에러 처리 + 네트워크 재연결
21. 반응형 점검 (교사 PC + 학생 모바일)
22. Vercel 배포

---

## 7. 와이어프레임 참고

별도 파일 `class-stock-wireframe-v3.html`을 브라우저에서 열면 교사/학생 화면의 UI 레퍼런스를 확인할 수 있다. 해당 와이어프레임의 디자인 톤(Toss 주식 탭 스타일 라이트 모드)을 기준으로 구현한다.

### v3 주요 화면
- **교사 수업**: 실시간 수업 진행 화면 (종목 공개, 거래 오픈/마감)
- **교사 리포트**: 수업 종료 후 분석 화면 (인지-확신 갭, 사분면 차트, 학급 투자 성향)
- **학생 수업**: 거래 화면 (찜하기, 매수/매도, 히든 종목 도전)
- **학생 결과**: 정산 후 최종 결과 화면 (종목별 수익, 핵심 종목 공개)
