# Class-Stock 환경 설정 가이드

> **용도:** Claude Code 프로젝트 초기 세팅 지시서

---

## 1. 프로젝트 초기화

```bash
# Vite + React + TypeScript 프로젝트 생성
npm create vite@latest class-stock -- --template react-ts
cd class-stock

# 핵심 의존성 설치
npm install @supabase/supabase-js zustand react-router-dom recharts qrcode.react

# 개발 의존성
npm install -D tailwindcss @tailwindcss/vite

# Tailwind 설정
# vite.config.ts에 @tailwindcss/vite 플러그인 추가
# src/index.css에 @import "tailwindcss" 추가
```

---

## 2. 환경변수 (.env.example)

프로젝트 루트에 `.env.example` 파일을 생성하고, 실제 값은 `.env.local`에 넣는다.

```env
# ── Supabase ──
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# ── App ──
VITE_APP_URL=http://localhost:5173
```

### 값 찾는 방법

1. Supabase 대시보드 (https://supabase.com/dashboard) 접속
2. 프로젝트 선택 → Settings → API
3. `Project URL` → `VITE_SUPABASE_URL`에 복사
4. `anon` `public` 키 → `VITE_SUPABASE_ANON_KEY`에 복사

### 주의사항

- `.env.local`은 `.gitignore`에 반드시 포함
- Vite에서 환경변수를 사용하려면 반드시 `VITE_` 접두어 필요
- 프론트엔드에 노출되는 키이므로 `anon` 키만 사용 (service_role 키 절대 사용 금지)

---

## 3. Supabase 클라이언트 초기화

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

---

## 4. Supabase 프로젝트 세팅 순서

### 4.1 프로젝트 생성
1. https://supabase.com/dashboard → "New Project"
2. 프로젝트명: `class-stock`
3. 리전: Northeast Asia (ap-northeast-1) 또는 가까운 리전
4. 비밀번호 설정 후 생성

### 4.2 데이터베이스 마이그레이션
1. Supabase 대시보드 → SQL Editor
2. `05-migration.sql` 파일 내용 전체를 붙여넣고 실행
3. 에러 없이 완료 확인

### 4.3 Realtime 활성화 확인
1. Database → Replication 메뉴
2. 아래 테이블이 활성화되어 있는지 확인:
   - sessions
   - stocks
   - students
   - bookmarks
   - holdings
3. 마이그레이션 SQL에 `ALTER PUBLICATION` 구문이 포함되어 있으므로 자동 활성화됨

### 4.4 Authentication 설정
1. Authentication → Providers
2. Email 활성화 확인 (기본 활성)
3. "Confirm email" 옵션: 파일럿 단계에서는 **비활성** 권장 (교사가 바로 사용 가능하도록)
4. Authentication → URL Configuration
   - Site URL: `http://localhost:5173` (개발), 배포 후 Vercel URL로 변경

---

## 5. Vercel 배포

### 5.1 초기 배포
```bash
# Vercel CLI 설치
npm install -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

### 5.2 환경변수 설정
Vercel 대시보드 → Settings → Environment Variables에 추가:

| Key | Value | Environment |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://your-project-id.supabase.co` | Production, Preview |
| `VITE_SUPABASE_ANON_KEY` | `your-anon-key` | Production, Preview |
| `VITE_APP_URL` | `https://your-app.vercel.app` | Production |

### 5.3 배포 후 Supabase URL 업데이트
Supabase 대시보드 → Authentication → URL Configuration:
- Site URL: `https://your-app.vercel.app`
- Redirect URLs: `https://your-app.vercel.app/**`

---

## 6. 프로젝트 구조 확인 체크리스트

```
class-stock/
├── .env.local              ← 실제 환경변수 (gitignore)
├── .env.example            ← 환경변수 템플릿 (커밋)
├── .gitignore              ← .env.local 포함 확인
├── index.html
├── package.json
├── vite.config.ts          ← tailwindcss 플러그인
├── tsconfig.json
├── src/
│   ├── main.tsx
│   ├── index.css           ← @import "tailwindcss"
│   ├── App.tsx             ← React Router 설정
│   ├── lib/
│   │   ├── supabase.ts     ← Supabase 클라이언트
│   │   └── types.ts        ← DB 타입 (supabase gen types로 생성 가능)
│   ├── stores/
│   ├── hooks/
│   ├── pages/
│   │   ├── Landing.tsx
│   │   ├── teacher/
│   │   └── student/
│   └── components/
│       ├── common/
│       ├── teacher/
│       └── student/
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql
```

---

## 7. 개발 서버 실행

```bash
# 환경변수 설정 확인
cp .env.example .env.local
# .env.local에 실제 Supabase URL과 키 입력

# 개발 서버 시작
npm run dev

# 브라우저에서 http://localhost:5173 접속
```

---

## 8. TypeScript 타입 자동 생성 (선택)

Supabase CLI로 DB 스키마에서 타입을 자동 생성할 수 있다.

```bash
# Supabase CLI 설치
npm install -g supabase

# 로그인
supabase login

# 타입 생성
supabase gen types typescript --project-id your-project-id > src/lib/types.ts
```

이렇게 하면 `Database` 타입이 자동 생성되어 Supabase 쿼리에서 타입 안전성을 보장할 수 있다.
