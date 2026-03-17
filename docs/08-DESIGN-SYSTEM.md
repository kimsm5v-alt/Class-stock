# Class-Stock 디자인 시스템

> **용도:** Claude Code가 모든 화면에서 일관되게 따라야 할 디자인 규칙  
> **레퍼런스:** class-stock-wireframe-v3.html  
> **모드:** 라이트 모드 전용 (다크 모드 미지원)

---

## 1. 컬러 토큰

Tailwind의 `tailwind.config.ts`에 아래 커스텀 컬러를 등록한다.

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        cs: {
          // 배경
          bg:       '#F7F7FA',   // 페이지 전체 배경
          surface:  '#FFFFFF',   // 카드, 모달, 사이드바 배경
          muted:    '#F0F0F5',   // 비활성 영역, 바 트랙, 입력 필드 배경
          hover:    '#E8E8EE',   // 호버 상태

          // 텍스트
          primary:  '#1A1A2E',   // 메인 텍스트
          secondary:'#6E6E82',   // 보조 텍스트, 라벨
          hint:     '#A0A0B2',   // 힌트, 비활성 텍스트

          // 브랜드 — 상승/매수
          up:       '#FF4747',   // 상승 컬러 (배경, 아이콘)
          'up-text':'#E03030',   // 상승 텍스트 (흰 배경 위 가독성)
          'up-soft':'rgba(255,71,71,0.08)',  // 상승 배경 tint

          // 하락/매도
          down:     '#3A7BDE',
          'down-soft':'rgba(58,123,222,0.08)',

          // 골드 — 히든 종목, 서프라이즈
          gold:     '#F0A030',
          'gold-text':'#C07800',
          'gold-soft':'rgba(240,160,48,0.08)',

          // 민트 — 성공, 접속, 정확률
          mint:     '#1AB07A',
          'mint-text':'#0D8A5E',
          'mint-soft':'rgba(26,176,122,0.08)',

          // 보더
          border:   'rgba(0,0,0,0.06)',    // 기본 보더
          border2:  'rgba(0,0,0,0.10)',    // 호버/강조 보더
        }
      }
    }
  }
}
```

### 컬러 사용 규칙

| 용도 | 컬러 | 절대 하지 말 것 |
|---|---|---|
| 페이지 배경 | `cs-bg` (#F7F7FA) | 순백(#FFF)을 페이지 배경으로 쓰지 않음 |
| 카드/패널 | `cs-surface` (#FFF) + shadow | 배경 없이 보더만 쓰지 않음 |
| 상승 수치 | `cs-up-text` (#E03030) | 순빨강(#FF0000) 쓰지 않음 |
| 하락 수치 | `cs-down` (#3A7BDE) | |
| 비활성 버튼 | `cs-muted` 배경 + `cs-hint` 텍스트 | |
| 히든/미스터리 | `cs-gold-text` + dashed border | |

---

## 2. 타이포그래피

### 폰트 패밀리

```html
<!-- index.html에 추가 -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
```

```css
/* Google Fonts import (Outfit, DM Mono) */
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

/* CSS 변수 */
--font-sans: 'Pretendard', 'Outfit', -apple-system, sans-serif;
--font-mono: 'DM Mono', monospace;
--font-display: 'Outfit', sans-serif;
```

| 용도 | 폰트 | 굵기 | 예시 |
|---|---|---|---|
| 큰 숫자 (수익률, 타이머, 포인트) | **Outfit** | 700~800 | `12,400` `0:42` |
| 작은 숫자 (퍼센트, 코드, 키) | **DM Mono** | 400~500 | `87%` `AB3K7F` |
| 한글 본문, 버튼, 라벨 | **Pretendard** | 400~700 | `매수` `거래 오픈` |
| 로고 | **Outfit** | 800 | `CLASS·STOCK` |

### 폰트 사이즈

| 레벨 | 사이즈 | 용도 |
|---|---|---|
| Display | 46~48px, Outfit 800 | 포트폴리오 총액, 타이머 |
| Heading | 30~32px, Outfit 700 | 통계 카드 숫자 |
| Title | 14~15px, Noto Sans KR 600~700 | 카드 타이틀, 종목명 |
| Body | 13px, Noto Sans KR 400~500 | 본문, 설명 |
| Caption | 11~12px, Noto Sans KR 400 | 힌트, 보조 텍스트 |
| Mono | 12px, DM Mono 500 | 퍼센트, 코드 |
| Label | 10px, DM Mono 500, letter-spacing 2px, uppercase | 섹션 라벨 |

---

## 3. 그림자 & 보더

```css
/* 기본 카드 그림자 */
--shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03);

/* 강조 카드 그림자 (포트폴리오 헤더 등) */
--shadow-lg: 0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.05);
```

| 요소 | 보더 | 그림자 | border-radius |
|---|---|---|---|
| 카드 | 1px solid cs-border | shadow | 16px |
| 입력 필드 | 1px solid cs-border | 없음 | 12px |
| 버튼 (primary) | 없음 | 컬러 glow | 12px |
| 버튼 (secondary) | 1px solid cs-border | 없음 | 12px |
| 태그/배지 | 없음 | 없음 | 4~6px |
| 네비게이션 pill | 없음 | shadow (active) | 20px |
| 히든 종목 카드 | 1.5px **dashed** cs-gold | 없음 | 12px |

---

## 4. 컴포넌트 스타일 가이드

### 4.1 버튼

**Primary (거래 오픈, 매수 등 핵심 액션)**
```
배경: linear-gradient(135deg, #FF4747, #FF7744)
텍스트: #FFFFFF, Noto Sans KR 700, 14px
패딩: 14px 가로 full-width
border-radius: 12px
box-shadow: 0 4px 20px rgba(255,71,71,0.15)
호버: translateY(-1px) + shadow 강화
```

**Secondary (거래 마감, 장 마감 등)**
```
배경: cs-muted (#F0F0F5)
텍스트: cs-secondary (#6E6E82)
보더: 1px solid cs-border
호버: cs-hover 배경
```

**Danger/Sell (매도)**
```
배경: cs-down-soft
텍스트: cs-down (#3A7BDE)
보더: 1px solid rgba(58,123,222,0.15)
```

**Challenge (히든 종목 도전)**
```
배경: linear-gradient(135deg, #F0A030, #FFBB33)
텍스트: #5A3800, font-weight 800
```

**Disabled**
```
배경: cs-muted
텍스트: cs-hint
cursor: not-allowed
```

### 4.2 카드

**기본 카드**
```
배경: cs-surface (#FFF)
보더: 1px solid cs-border
border-radius: 16px (큰 카드) 또는 12px (리스트 아이템)
box-shadow: shadow
패딩: 18~20px
```

**보유 종목 카드 (학생)**
```
기본 카드 + 
보더: rgba(255,71,71,0.15)
배경: linear-gradient(135deg, #FFF, rgba(255,71,71,0.02))
```

**히든 종목 카드 (학생)**
```
보더: 1.5px dashed rgba(240,160,48,0.25)
배경: linear-gradient(135deg, #FFF, rgba(240,160,48,0.03))
```

**미공개 종목 카드**
```
기본 카드 + opacity: 0.45
```

### 4.3 입력 필드

```
배경: cs-surface (#FFF)
보더: 1px solid cs-border2
border-radius: 12px
패딩: 14px 16px
font-size: 14px, Noto Sans KR
포커스: border-color cs-up, box-shadow 0 0 0 3px cs-up-soft
placeholder: cs-hint 컬러
```

### 4.4 태그/배지

| 종류 | 배경 | 텍스트 | 용도 |
|---|---|---|---|
| HOT | cs-up-soft | cs-up-text | 매수율 높은 종목 |
| HIDDEN | cs-gold-soft | cs-gold-text | 히든 종목 |
| NEW / 공개됨 | cs-mint-soft | cs-mint-text | 방금 공개된 종목 |
| 보유 포인트 | cs-up-soft | cs-up-text | "3,000pt" 배지 |

```
font-family: DM Mono
font-size: 9~10px
font-weight: 500
padding: 2px 6px
border-radius: 4~6px
letter-spacing: 0.5px
```

### 4.5 바 차트 (매수율)

```
트랙: cs-muted, height 28px, border-radius 8px
바 (높음 70%+): linear-gradient(90deg, #FF4747, #FF8866)
바 (중간 30~70%): linear-gradient(90deg, #F0A030, #FFD060)
바 (낮음 ~30%): linear-gradient(90deg, #C8C8D0, #DADAE0)
바 위 하이라이트: 상단 50%에 rgba(255,255,255,0.35) → transparent
애니메이션: width transition 1.2s cubic-bezier(.22,1,.36,1)
```

### 4.6 거래 상태 배너 (학생)

**거래 오픈 시**
```
배경: linear-gradient(135deg, rgba(255,71,71,0.06), rgba(255,119,68,0.06))
텍스트: cs-up-text
보더: 1.5px solid rgba(255,71,71,0.18)
애니메이션: border-color 펄스 2s infinite
카운트다운: Outfit 800, 24px, cs-up 컬러
```

**거래 닫힘 시**
```
배경: cs-muted
텍스트: cs-hint
보더: 1px solid cs-border
```

### 4.7 포트폴리오 헤더 (학생)

```
배경: cs-surface
border-radius: 22px
box-shadow: shadow-lg
text-align: center
패딩: 30px 20px 24px

총액: Outfit 800, 48px, letter-spacing -2px
변동: DM Mono 500, 14px, pill 형태 (border-radius 20px)
  상승: cs-up-soft 배경 + cs-up-text
  하락: cs-down-soft 배경 + cs-down
정확률: 11px, cs-hint + cs-mint-text(숫자)

상단 데코: radial-gradient(ellipse, rgba(255,71,71,0.08), transparent)
```

### 4.8 섹션 라벨

```
font-family: DM Mono
font-size: 10px
font-weight: 500
color: cs-hint (#A0A0B2)
letter-spacing: 2px
text-transform: uppercase
margin-bottom: 4px
```

### 4.9 라이브 인디케이터 (접속 표시)

```
width: 8px, height: 8px
border-radius: 50%
background: cs-mint (#1AB07A)
box-shadow: 0 0 8px rgba(26,176,122,0.5)
animation: blink 2.5s infinite (opacity 1 → 0.35)
```

---

## 5. 레이아웃 규칙

### 교사 화면
```
전체: 2단 그리드 (좌 300px 사이드바 + 우 나머지)
사이드바: cs-surface 배경, 우측 보더, padding 20px
메인: cs-bg 배경, padding 24px
최소 너비: 1024px
모바일: 단일 컬럼으로 전환
```

### 학생 화면
```
최대 너비: 400px, 중앙 정렬 (mx-auto)
배경: cs-bg
패딩: 16px 좌우, 하단 90px (잔고 바 공간)
카드 간격: 8~12px
하단 잔고 바: fixed, 하단 고정, 블러 배경
```

### 공통
```
페이지 배경: cs-bg (#F7F7FA) — 모든 페이지 동일
카드 배경: cs-surface (#FFF) — 항상 페이지보다 밝게
카드 간격: 14~20px
```

---

## 6. 애니메이션

| 요소 | 애니메이션 | 속성 |
|---|---|---|
| 바 차트 로딩 | width 0% → 실제값 | 1.2s cubic-bezier(.22,1,.36,1) |
| 거래 배너 펄스 | border-color 변화 | 2s infinite |
| 라이브 dot | opacity 변화 | 2.5s infinite |
| 찜하기 ⭐ | scale 1→1.3→1 | 0.3s ease |
| 버튼 호버 | translateY(-1px) | 0.2s |
| 카드 press | scale(0.985) | 0.15s |
| 종목 공개 | opacity 0→1 + translateY | 0.4s ease-out |

---

## 7. 아이콘/이모지 사용 규칙

| 용도 | 아이콘 |
|---|---|
| 찜하기 (활성) | ⭐ |
| 찜하기 (비활성) | ☆ |
| 미공개 종목 | 🔒 |
| 인사이트 | 💡 |
| 서프라이즈 | ⚡ |
| 거래 오픈 알림 | 🔓 (텍스트로 "거래 윈도우 오픈!") |
| 경고 (갭 발생) | ⚠️ |
| 성공 | ✅ |
| 히든 공개 | 🔓 |
| 핵심 종목 | ★ |

별도 아이콘 라이브러리는 사용하지 않는다. 이모지로 통일.

---

## 8. 교사 리포트 화면

### 8.1 수업 한 눈에 (통계 카드 3개)
```
- 학급 평균 정확률: cs-up-text
- 참여율: cs-mint-text
- 총 거래 건수: cs-primary
```

### 8.2 개념별 분석 (인지-확신 갭)
```
레이아웃: 4열 그리드 (종목명 / 찜하기율 바 / 매수율 바 / 갭 수치)
찜하기율 바: cs-gold, opacity 0.5
매수율 바: bar-fill (hi/md/lo)
갭 수치 (정상): cs-mint-text
갭 수치 (경고): cs-up-text + ⚠️ 아이콘
```

**갭 해석 가이드**
```
🟢 찜↑ 매수↑ = 잘 이해
🟡 찜↑ 매수↓ = 인지-확신 갭
🔴 찜↓ 매수↓ = 놓친 개념
🔵 찜↓ 매수↑ = 소수만 확신
```

### 8.3 개념 이해도 매트릭스 (사분면 차트)
```
X축: 찜하기율 (인지) 0~100%
Y축: 매수율 (확신) 0~100%
점선: 50% 기준선 (dashed, rgba(0,0,0,0.08))

버블 색상:
- 핵심 종목: #E03030
- 히든 종목: #C07800
- 일반 종목: #888888

사분면 라벨:
- 우상단: "잘 이해" (cs-mint-text)
- 좌상단: "인지-확신 갭" (cs-gold-text)
- 좌하단: "놓친 개념" (cs-up-text)
- 우하단: "소수만 확신" (cs-down)
```

### 8.4 학급 투자 성향
```
성향 태그: pill 형태, cs-up-soft 배경 + cs-up-text
분포 바: 비율에 따라 색상 구분된 가로 바 (height 32px)
```

### 8.5 놓친 개념 알림
```
배경: cs-up-soft
보더: 1px solid rgba(255,71,71,0.12)
border-radius: 12px
타이틀: cs-up-text, font-weight 600
```

### 8.6 수업 추이 차트
```
세로 막대 차트 형태
오늘 막대: cs-up 그라데이션 + box-shadow glow
이전 막대: cs-up-soft
X축: 날짜 (font-size 10px, cs-hint)
```

---

## 9. 학생 결과 화면

### 9.1 최종 결과 헤더
```
포트폴리오 헤더 확장 버전
총액: Outfit 800, 52px
변동률: font-size 16px
정확률: font-size 13px
```

### 9.2 종목별 결과 카드
**핵심 종목 (보유)**
```
보더: rgba(255,71,71,0.2)
배경: linear-gradient(135deg, #fff, rgba(255,71,71,0.04))
수익: Outfit 700, 20px, cs-up-text
배율: DM Mono, 11px (예: "×3 (+200%)")
태그: "핵심" (cs-up-soft)
```

**미투자 종목**
```
opacity: 0.7
수익 영역: "—" 표시, cs-hint
```

**히든 종목 (공개됨)**
```
보더: 1.5px dashed rgba(240,160,48,0.3)
배경: linear-gradient(135deg, #fff, rgba(240,160,48,0.04))
아이콘: 🔓
태그: "히든 공개!" (cs-gold-soft) + "핵심" (해당시)
놓친 경우: "×3 놓침" (cs-gold-text)
```

### 9.3 수업 나가기 버튼
```
btn-secondary 스타일
width: 100%
margin-top: 20px
```
