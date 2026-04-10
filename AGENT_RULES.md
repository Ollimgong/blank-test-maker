# Agent Rules (AI/Bot 행동 지침)

이 파일은 BTM(Blank Test Maker) 프로젝트를 다루는 AI 및 프롬프트 에이전트들이 준수해야 하는 **최우선 정책** 문서입니다. 모든 답변 및 코드 작성 전 이 규칙을 숙지하십시오.

## 1. 아키텍처 및 스택 제한 (Architecture Constraints)
1. **NO Electron**: 과거 이 프로젝트는 Electron 기반 데스크톱 앱이었습니다. 그러나 현재는 Supabase + React 기반의 클라우드 SaaS 웹 애플리케이션으로 전면 전환되었습니다. **절대 `electron` 모듈이나 데스크톱 API(예: `ipcRenderer`, `fs.readFile` 등)를 다시 도입하거나 관련 코드를 생성하지 마십시오.** 모든 데이터는 로컬 스토리지 또는 Supabase API를 통해 처리됩니다.
2. **배포 플랫폼 (Vercel 최적화)**: GitHub Actions 배포는 더 이상 사용하지 않으며 Vercel을 메인 런타임 호스팅으로 타겟팅합니다. Vite/React SPA의 라우팅이나 환경 변수 처리는 Vercel 표준을 따릅니다.
3. **No Tailwind / Pure Inline CSS**: A4 인쇄의 `740x1046px` 절대 규격을 유지하기 위해, 출력물에 영향을 주는 스타일링은 가급적 인라인 CSS나 모듈 CSS로 하드코딩합니다. 외부 CSS 프레임워크(Tailwind 등)의 주입을 억제하십시오.

## 2. 상태 관리 지침 (State Management)
1. **React State Stale Closure 방지**: `contentEditable` 에디터의 키보드 이벤트 핸들러 등 빈번하게 상태가 업데이트되는 영역은 Stale Closure 취약점이 존재합니다. 상태 변이를 시도할 때는 반드시 `setUnit(prev => ...)` 같은 Functional Update 패턴을 강제하십시오. `updateUnit` 헬퍼 함수를 통한 업데이트만 허용됩니다.

## 3. 코드 구조 요건 (Code Structure)
1. **컴포넌트 분리 원칙**: 모놀리식 방식을 지양합니다. 기능을 추가할 때 `src/blank_test_maker.jsx` 같은 단일 진입점에 코드를 들이붇지 말고, `src/components/`, `src/utils/`에 모듈화하여 배치하십시오.

## 4. 문서화 요건 (Documentation Policy)
1. **DRY (Don't Repeat Yourself)**: 모든 문서는 `ADR/`에 결정 사항을 기록하고 `README.md`에서 인덱싱합니다. `README.md`에 기술 스펙을 중복 나열하지 마십시오. BTM 문법은 `BTM_SPEC.md` 단 한 곳에서만 관리합니다.
