# Supabase 세팅 가이드 (처음부터 끝까지)

> 한 번도 안 써봤어도 따라할 수 있도록 작성

---

## Step 1. Supabase 가입

1. https://supabase.com 접속
2. 우측 상단 "Start your project" 또는 "Sign Up" 클릭
3. **GitHub 계정으로 가입**하는 게 가장 빠름 (GitHub 없으면 이메일 가입도 가능)
4. 가입 완료되면 대시보드가 보임

---

## Step 2. 새 프로젝트 만들기

1. 대시보드에서 "New Project" 클릭
2. Organization 선택 (처음이면 기본으로 하나 있음, 그거 선택)
3. 아래 내용 입력:

| 항목 | 입력값 |
|---|---|
| Project name | `class-stock` |
| Database Password | 아무거나 (메모해둬! 나중에 필요할 수 있음) |
| Region | `Northeast Asia (Tokyo)` ← 한국에서 가장 빠름 |
| Pricing Plan | Free (무료) 선택 |

4. "Create new project" 클릭
5. **1~2분 기다리면** 프로젝트가 생성됨 (로딩 화면 나옴, 기다려)

---

## Step 3. API 키 복사하기

프로젝트가 만들어지면 이 두 값이 필요해. 이걸 나중에 코드에 넣음.

1. 왼쪽 메뉴에서 ⚙️ **Project Settings** 클릭 (맨 아래 톱니바퀴)
2. **API** 탭 클릭
3. 두 가지를 메모장에 복사해둬:

| 찾을 것 | 어디 있음 | 예시 |
|---|---|---|
| **Project URL** | `API Settings` 섹션의 `Project URL` | `https://abcdefgh.supabase.co` |
| **anon public 키** | `Project API keys` 섹션의 `anon` `public` | 긴 문자열 `eyJhbGci...` |

⚠️ **service_role 키는 절대 복사하지 마!** anon public만 쓰면 돼.

---

## Step 4. 데이터베이스 테이블 만들기

여기서 05-migration.sql 파일을 실행해.

1. 왼쪽 메뉴에서 **SQL Editor** 클릭 (데이터베이스 아이콘 아래에 있음)
2. "New query" 클릭
3. `05-migration.sql` 파일의 **내용 전체**를 복사해서 에디터에 붙여넣기
4. 우측 하단 **"Run"** 버튼 클릭 (또는 Ctrl+Enter)
5. 하단에 `Success. No rows returned` 같은 메시지가 뜨면 성공

만약 에러가 나면:
- `relation already exists` → 이미 실행한 거. 무시해도 됨
- 다른 에러 → 에러 메시지 전체를 복사해서 Claude Code한테 보여줘

---

## Step 5. Realtime 확인

테이블의 실시간 동기화가 켜져있는지 확인해.

1. 왼쪽 메뉴 **Database** 클릭
2. **Replication** 탭 클릭
3. `supabase_realtime` 항목에서 아래 테이블들이 체크되어 있는지 확인:
   - ✅ sessions
   - ✅ stocks
   - ✅ students
   - ✅ bookmarks
   - ✅ holdings

SQL에서 이미 활성화했으니 보통은 켜져 있을 거야. 만약 안 켜져 있으면 각 테이블 옆 토글을 눌러서 켜줘.

---

## Step 6. 이메일 인증 간소화

교사가 가입할 때 이메일 확인 없이 바로 쓸 수 있게 해주자 (파일럿이니까).

1. 왼쪽 메뉴 **Authentication** 클릭
2. **Providers** 탭 클릭
3. **Email** 항목 클릭해서 펼치기
4. **"Confirm email"** 토글을 **끄기** (OFF)
5. **Save** 클릭

---

## Step 7. 코드에 키 넣기

Claude Code가 프로젝트를 만들면 `.env.local` 파일이 필요해.

프로젝트 루트에 `.env.local` 파일을 만들고 Step 3에서 복사한 값을 넣어:

```
VITE_SUPABASE_URL=https://여기에-project-url-붙여넣기.supabase.co
VITE_SUPABASE_ANON_KEY=여기에-anon-public-키-붙여넣기
VITE_APP_URL=http://localhost:5173
```

⚠️ 등호(=) 양쪽에 **공백 없이** 붙여야 해!

---

## Step 8. 배포 후 URL 설정 (나중에)

Vercel에 배포한 다음에 해야 하는 거. 지금 안 해도 됨.

1. Supabase 대시보드 → **Authentication** → **URL Configuration**
2. **Site URL**을 Vercel에서 받은 주소로 변경: `https://your-app.vercel.app`
3. **Redirect URLs**에 추가: `https://your-app.vercel.app/**`

---

## 정리: 지금 당장 해야 할 것

| 순서 | 할 일 | 소요 시간 |
|---|---|---|
| 1 | Supabase 가입 | 1분 |
| 2 | 프로젝트 만들기 (class-stock) | 2분 |
| 3 | API 키 2개 복사해서 메모장에 저장 | 1분 |
| 4 | SQL Editor에서 migration.sql 실행 | 1분 |
| 5 | Realtime 켜져있는지 확인 | 30초 |
| 6 | 이메일 인증 Confirm email 끄기 | 30초 |
| 7 | Claude Code가 만든 .env.local에 키 붙여넣기 | 1분 |

**총 7분이면 끝나.** 다 하고 나서 Claude Code한테 작업 시작하라고 하면 돼.
