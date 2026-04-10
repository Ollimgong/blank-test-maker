# ADR-003: 모놀리식 구조 분할 및 리팩토링

**작성/업데이트**: 2026-04-10  
**상태**: 진행 중 (In Progress)

## 배경 (Context)
MVP 개발 과정에서 빠른 검증을 위해 단일 파일(`src/blank_test_maker.jsx`)에 파서 함수, React Hooks, A4 렌더링 DOM 패턴을 모두 밀어넣었습니다. 2,100줄을 돌파하면서 다음과 같은 문제가 불거졌습니다:
- 컴포넌트 간 변수 충돌 위험성 증가.
- 특정 로직(예: 에디터 뷰) 수정 시 전체 파일 스캔의 피로도 증가.
- React 성능 최적화(`memo` 등) 실패 및 Stale Closure 현상의 잦은 발현.

## 결정 (Decision)
- **모듈형 폴더 트리 분할**:
  - `src/components/Editor/`: 에디터 본체와 실시간 타자기 UI 관할.
  - `src/components/Preview/`: 인쇄 렌더링, 뱃지 DOM 표시 관할.
  - `src/utils/`: BTM 파서 함수, 상태/문자열 조작 함수 관할.
- 단, 앱의 전역 `state` 동기화 로직은 당분간 최상단 `App`에 유지하며 하향식(Prop Drilling) 방식을 점진적으로 Context API 혹은 Zustand로 이관하는 것을 추후 과제로 둡니다.

## 영향 (Consequences)
- (긍정) 가독성이 수백 배 개선됩니다.
- (긍정) 유지보수성이 크게 상승합니다.
- (주의) 분할 과정 중 Prop 의존성이 누락되어 인쇄 레이아웃 규칙이 깨지는 실수가 없도록 극도로 주의해야 합니다.
