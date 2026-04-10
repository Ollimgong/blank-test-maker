# CLAUDE.md

## 프로젝트 개요
영어학원용 **백지테스트 메이커** — 시험지를 편집하고 A4 규격에 맞게 인쇄하는 웹 애플리케이션(SaaS).
초기 GitHub Pages → 중간 Electron 데스크톱 앱 전환 → 현재 **Supabase 연동을 기반으로 한 웹앱(GitHub Pages 자동 배포)** 으로 구조가 확정되었습니다.

## 핵심 스택 및 파일
- **프론트엔드**: React 19 + Vite
- **백엔드/DB**: Supabase 연동 (Auth, users_settings, workspace_members 등)
- **배포**: GitHub Actions를 통한 GitHub Pages 자동 배포 (main 브랜치 푸시 감지)
- `src/blank_test_maker.jsx` — 핵심 편집, 렌더링, API 호출을 통괄하는 메인 컴포넌트
- `.github/workflows/deploy.yml` — 프론트엔드 CI/CD 설정 파일

## 실행 환경
- **개발 서버**: `npm run dev` (Vite)
- 외부 라이브러리: `@supabase/supabase-js` 연동
- 스타일: 인라인 스타일(테일윈드 미사용) 및 고정 크기 레이아웃 
- 환경변수 (`.env.local` 필요): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## 데이터 구조 — Supabase 및 로컬
- 기존 Electron의 로컬 파일 시스템에서 브라우저 기반으로 완전히 분리되었습니다.
- **워크스페이스**: 원장님/선생님의 학원 공간(workspace) 합류 및 관리 체계 지원.
- 전역 설정(tags 포함)은 로그인된 사용자의 경우 Supabase `users_settings` 테이블과 백그라운드 동기화 됨.

### 단원(Unit) 데이터 모델
```javascript
{
  title: "수동태",
  rows: [{               // 30행 고정
    id,
    l: { text, indent },  // 좌우 2열 독립. 모든 서식은 인라인 마크업으로 text에 포함
    r: { text, indent }
  }]
}
```

## 앱 구조 (단일 UI)
- 통합 사이드바(목록 관리) + 2열 에디터(A4 레이아웃) 구조.
- **에디터 = 프리뷰**: contentEditable 기반, 포커스 시 날것의 마크업과 문법 하이라이팅 표시, 비포커스 시 뱃지와 서식이 완전 적용된 프리뷰 렌더링.
- **A4 렌더링 최적화**: 30행 고정, 행 높이 27px, 740x1046px A4 비율 엄격 하드코딩. 인쇄 시 여백 및 확대/축소 보정 최소화 목적.
- **다크모드 지원**: 설정 상태는 DB 및 로컬스토리지에 저장. 인쇄 뷰는 강제 화이트 유지.

## BTM (Blank Test Markup) 규약
상세 명세는 [`BTM_SPEC.md`](BTM_SPEC.md) 참조.

- **헤더/소제목**: `# `, `## `로 시작
- **마커 태그**: `@태그`, `[라벨]`
- **보임 제어 (중요)**: `!` 기호로 시작. 최근 업데이트로 **띄어쓰기 유무와 무관하게 동작**하도록 유연화 (예: `!@개념`, `!# 헤더` 모두 완벽 호환). 
- 기능: 에디터에서 정해진 마크업대로 렌더링, Worksheet 모드 시 일반 텍스트는 숨김(Transparent) 처리되나 `!` 지정 라인은 유지.

## 작업 시 주의사항
1. **Electron 완전 배제**: 과거 사용된 Electron 코드나 브릿지(`ipcRenderer`)는 제거되었으므로 절대 재개입시키거나 언급하지 말 것. 순수 웹 표준 API로 개발.
2. **단일 파일 유지 (`blank_test_maker.jsx`)**: 매우 거대한 모놀리식 구조이므로, React state hook과 Closure 렌더링(`setUnit((prev) => ...)` 등 함수형 상태 업데이트) 패러다임에 매우 유의해야 함. 이벤트 핸들러가 stale closure에 빠져 기존 입력을 덮어씌우는 이슈(데이터 증발)가 쉽게 발생함.
3. **인라인 파서 조심 (`parseInlineMarkup`)**: 마크업 정규화 과정에서 문자열 단위 인덱싱 연산이 많으므로 부수 효과에 조심할 것.
