# 백지테스트 메이커 (Blank Test Maker)

영어학원에서 사용하는 서식 및 문법 내재화 백지테스트(빈칸 시험지)를 직관적으로 편집하고 완벽하게 A4로 인쇄할 수 있는 웹 애플리케이션(SaaS)입니다. 순수 기반 클라우드 렌더링 스택(React + Vite + Supabase)으로 작동합니다.

이 문서(`README.md`)는 프로젝트의 전체 아키텍처 및 내부 문서 체계의 시작점이 되는 최상위 목차입니다. 문서 내용이 중복되지 않도록 카테고리별로 분리하여 관리합니다.

---

## 📚 문서 디렉토리 (Documentation Index)

### 1. 개발 및 아키텍처 규칙
- **[`AGENT_RULES.md`](AGENT_RULES.md)**: AI(Antigravity 등) 및 신규 개발자가 반드시 지켜야 하는 최상위 기술 제약/규칙 (예: Electron 금지, Vercel 규칙 등).
- **[`ADR/`](ADR/)**: 중요한 아키텍처 의사결정 기록 보관소. 
  - `ADR/001-saas-cloud-transition.md`: 데스크톱 앱에서 클라우드 SaaS로의 전환 결정문
  - `ADR/002-btm-markup-spec.md`: BTM 마크업 분석 규칙과 Transparent Masking 전략
  - `ADR/003-monolith-refactoring.md`: 컴포넌트 모듈화 분리 설계서

### 2. 문법 명세 및 스펙
- **[`BTM_SPEC.md`](BTM_SPEC.md)**: 시험지를 꾸미거나 블라인드 처리할 때 사용하는 마크업 언어(Blank Test Markup)의 공식 해설서.

### 3. 로드맵 및 백로그
- **[`ROADMAP.md`](ROADMAP.md)**: 현재 진행 중인 스프린트 목표(컴포넌트 분리 등) 및 묵혀둔 이슈(인쇄 성능 개선, 들여쓰기 시스템 부활 등) 추적기.

---

## 🚀 실행 및 배포 (Run & Deployment)

### 로컬 환경 세팅
1. 패키지 설치
```bash
npm install
```
2. `.env.local` 세팅 (루트 폴더)
```
VITE_SUPABASE_URL=여기에_주소
VITE_SUPABASE_ANON_KEY=여기에_키
```
3. 로컬 서버 구동
```bash
npm run dev
```

### ☁️ 클라우드 배포 가이드 (Vercel)
본 프로젝트는 **Vercel** 배포에 완벽하게 최적화(Zero-config)된 React/Vite SPA 구조입니다. 
아래 절차를 통해 Vercel 인프라에 올릴 수 있습니다.

**[Vercel 대시보드에서 연동하기 (권장)]**
1. [Vercel](https://vercel.com/)에 회원가입 및 로그인합니다.
2. 대시보드 우측 상단 `[Add New...] -> [Project]` 클릭.
3. 이 GitHub 저장소(`blank-test-maker`)의 권한을 허용하고 Import 합니다.
4. Framework Preset은 `Vite`로 자동 인식됩니다. (Build Command: `npm run build`)
5. 하단의 `Environment Variables` 항목을 열쇠 모양 버튼과 함께 펼칩니다. 로컬 `.env.local` 에 있던 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 그대로 복사하여 추가합니다.
6. `Deploy` 버튼을 클릭하면 불과 30초 내에 글로벌 CDN으로 프로덕션 배포가 완료되며 라이브 링크가 발급됩니다. 이후부터는 GitHub `main`에 코드가 푸시될 때마다 Vercel이 자동으로 가져가서 실시간 배포합니다!
