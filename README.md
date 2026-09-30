# Summit Scrap — Prototype v0.1

브라우저에서 플레이하는 독창적인 2D 물리 등반 게임입니다. 플레이어는 **고철 캡슐** 안에서 360도로 회전하는 **자석 곡괭이**를 지형에 걸고, Matter 물리의 반작용으로 유리 협곡을 오릅니다. 특정 원작의 캐릭터·맵·그래픽·사운드를 사용하지 않았습니다.

## 프로젝트 구조

```text
app/
  globals.css          # 전체 UI 및 반응형 스타일
  layout.tsx           # Next.js 루트 레이아웃/메타데이터
  page.tsx             # 인증, 대시보드, 기록, 랭킹 화면
components/
  GameCanvas.tsx       # Phaser 3 + Matter Stage 1
lib/
  supabase.ts          # 환경변수 기반 Supabase 클라이언트
  types.ts             # 랭킹 타입과 시간 포맷
supabase/
  schema.sql           # 테이블, 인덱스, RLS, 트리거, 랭킹 뷰
.env.example           # 필요한 환경변수 예시
```

구조상 Next.js가 계정/화면 전환을 담당하고, 게임 화면에서만 Phaser를 동적으로 불러옵니다. 브라우저에는 공개 가능한 Supabase anon key만 전달되며 실제 접근 권한은 PostgreSQL RLS가 제한합니다.

## 1. 프로젝트 실행 준비

1. [Node.js](https://nodejs.org/)의 **LTS 버전(20 이상)**과 Git을 설치합니다.
2. 터미널에서 저장소를 내려받고 폴더로 이동합니다.
   ```bash
   git clone <이 GitHub 저장소 URL>
   cd hangari
   ```
3. 패키지를 설치합니다.
   ```bash
   npm install
   ```
4. 아래 2~5절대로 Supabase와 환경변수를 먼저 준비합니다.
5. `npm run dev`를 실행하고 브라우저에서 `http://localhost:3000`을 엽니다.

## 2. Supabase 프로젝트 만들기

1. [supabase.com](https://supabase.com/)에 가입하고 대시보드에 로그인합니다.
2. **New project**를 클릭합니다.
3. Organization을 선택하고 프로젝트 이름(예: `summit-scrap`)을 입력합니다.
4. 강력한 Database Password를 생성해 안전하게 보관합니다. 이 비밀번호는 앱 코드에 넣지 않습니다.
5. 가까운 Region을 선택하고 **Create new project**를 클릭합니다.
6. 상태가 준비될 때까지 기다립니다.

## 3. 데이터베이스 SQL 적용

1. Supabase 프로젝트 왼쪽 메뉴에서 **SQL Editor**를 엽니다.
2. **New query**를 클릭합니다.
3. 이 저장소의 [`supabase/schema.sql`](supabase/schema.sql) 전체를 복사해 붙여넣습니다.
4. 오른쪽 아래 **Run**을 한 번 클릭합니다.
5. **Table Editor**에 `profiles`, `game_records`가 보이는지 확인합니다.

SQL은 다음을 함께 설정합니다.

- 회원 탈퇴 시 함께 삭제되는 프로필과 기록 테이블
- 조회 성능용 인덱스
- 회원가입 시 nickname을 프로필로 옮기는 Auth 트리거
- 로그인 사용자가 자기 기록만 추가/조회/삭제하고 자기 프로필만 수정하는 RLS 정책
- 원본 기록을 공개하지 않고 사용자별 Stage 1 최고 기록만 제공하는 `stage1_leaderboard` 뷰

> 이미 SQL을 실행한 프로젝트에서 다시 실행하면 “already exists” 오류가 납니다. 초기 개발 중 완전히 재설정하려면 Table Editor에서 두 테이블을 삭제하고 SQL Editor에서 뷰/함수/트리거까지 제거하거나 새 Supabase 프로젝트를 사용하는 것이 가장 쉽습니다.

## 4. Supabase Auth 설정

1. 왼쪽 메뉴 **Authentication → Providers**를 엽니다.
2. **Email** provider가 활성화되어 있는지 확인합니다.
3. 실제 이메일 확인을 사용할 경우 **Confirm email**을 켭니다. 가입자는 수신한 확인 링크를 누른 뒤 로그인해야 합니다.
4. 빠른 로컬 테스트만 할 때는 Confirm email을 잠시 끌 수 있지만, 배포 서비스에서는 켜는 것을 권장합니다.
5. **Authentication → URL Configuration**에서:
   - Site URL: 로컬 테스트 중에는 `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/**`
   - 배포 뒤에는 Vercel 주소(예: `https://summit-scrap.vercel.app/**`)도 추가
6. 비밀번호는 Supabase Auth만 관리합니다. `profiles` 또는 다른 일반 테이블에는 저장되지 않습니다.

## 5. 환경변수 설정

1. Supabase에서 **Project Settings(톱니바퀴) → API**로 이동합니다.
2. Project URL과 **anon/public key**(새 UI에서는 Publishable key)를 찾습니다. `service_role`/Secret key는 절대 브라우저 앱에 넣지 마세요.
3. 루트의 예시 파일을 복사합니다.
   ```bash
   cp .env.example .env.local
   ```
4. `.env.local`을 열고 다음처럼 실제 값으로 교체합니다.
   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=실제_anon_또는_publishable_key
   ```
5. `.env.local`은 `.gitignore`에 포함되어 GitHub에 올라가지 않습니다. 값을 바꾼 후에는 개발 서버를 다시 시작합니다.

## 6. 로컬 실행 및 확인

```bash
npm run dev
```

1. `http://localhost:3000`에서 **회원가입**을 누릅니다.
2. 닉네임, 이메일, 6자 이상 비밀번호를 입력합니다.
3. 이메일 확인을 켰다면 메일의 링크를 누른 후 로그인합니다.
4. **Stage 1 시작**을 누릅니다. 로그인하지 않은 사용자는 게임 화면에 접근할 수 없습니다.
5. 마우스를 캡슐 주위로 움직여 도구를 회전하고, 청록색 끝을 지형에 걸어 캡슐을 밉니다. `R` 또는 Restart로 처음부터 시작합니다.
6. 정상 센서에 캡슐이 닿으면 시간이 저장되고 대시보드에서 개인 최고 기록과 TOP 10을 확인할 수 있습니다.

배포 전 정적 검사와 프로덕션 빌드도 확인합니다.

```bash
npm run lint
npm run build
```

## 7. Vercel 배포

1. 작업 내용을 GitHub 저장소에 push합니다.
2. [vercel.com](https://vercel.com/)에 GitHub 계정으로 로그인합니다.
3. **Add New → Project**에서 이 저장소를 Import합니다.
4. Framework Preset이 **Next.js**인지 확인합니다. Build Command와 Output Directory는 기본값으로 둡니다.
5. **Environment Variables**를 펼쳐 아래 두 값을 각각 추가합니다.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Production, Preview, Development 중 사용할 환경을 모두 체크하고 **Deploy**를 클릭합니다.
7. 배포가 끝나면 Vercel이 준 `https://...vercel.app` 주소를 복사합니다.
8. Supabase **Authentication → URL Configuration**으로 돌아가 Site URL을 이 주소로 바꾸고 Redirect URLs에 `https://...vercel.app/**`를 추가합니다.
9. 새 계정을 만들어 로그인, 플레이, 기록 저장, 랭킹 표시까지 확인합니다.

환경변수를 수정했다면 Vercel **Settings → Environment Variables**에서 수정한 다음 **Deployments → Redeploy**해야 새 빌드에 반영됩니다.

## Stage 1 설계

베이스캠프 → 낮은 우측 선반 → 교차 경사면 → 좁은 중앙 발판 → 좌우 지그재그 절벽 → 정상 플랫폼 순서입니다. 약 3,300px 높이로 구성했고, 실수하면 중간 체크포인트 없이 실제 아래 지형으로 떨어집니다. 숙련도에 따라 약 2~5분을 목표로 합니다.

## 보안 및 프로토타입 범위

- anon key는 공개 클라이언트 식별자이며, 보안 경계는 RLS입니다. `service_role` key를 사용하면 RLS를 우회하므로 프런트엔드에 절대 넣지 않습니다.
- v0.1은 클라이언트가 클리어 시간을 제출합니다. 공개 경쟁 서비스를 만들 때는 서버 권위 검증, 부정행위 방지, 요청 제한을 추가해야 합니다.
- 게임은 데스크톱 마우스를 우선 지원합니다. 모바일 터치에서도 포인터 입력은 작동하지만 조작감은 데스크톱에 최적화되어 있습니다.
