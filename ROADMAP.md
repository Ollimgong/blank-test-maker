# BTM 개발 로드맵 (ROADMAP)

본 문서는 프로젝트의 현 진행 상황(Sprint)과 향후 남은 백로그(Backlog) 사항들을 추적합니다.

## ✅ 완료된 마일스톤 (Completed)
- [x] 순수 웹(React) 기반 BTM 에디터 구축 (contentEditable 기반 인라인 렌더링)
- [x] A4 해상도(740x1046px) 완전 고정 및 `window.print()` 규격 대응
- [x] 인라인 BTM 파서 도입 (`#`, `##`, `@태그`, `[라벨]`)
- [x] **! 마커 유연성 도입**: `! ` 와 같이 빈칸을 강제하던 조건 완화 (`!@태그` 등 대응 완료)
- [x] **클라우드 이동 (Supabase)**: Electron 종속성 전면 폐기, Vercel/Web 환경으로의 마이그레이션 (`users_settings`, 워크스페이스 연동)
- [x] **들여쓰기 시스템 재구현 (Structural Indentation)**: UI와 Ghost System 렌더링 충돌 해결 및 기능 병합 완료

## 🔄 현재 진행 중인 마일스톤 (Current Sprint)
- [x] **디렉토리/폴더 모듈화 (컴포넌트 분리)**
  - 기존 2,100줄짜리 `src/blank_test_maker.jsx` 파일을 도메인 영역(Editor, Preview, Utils, Modal)으로 기능 단위 분할.
- [x] Vercel 배포 세팅 및 프로덕션 파이프라인 정리 (`.github/workflows` 폐기)

## 📅 백로그 및 이슈 (Backlog & Known Issues)

2. **썸네일 프리뷰 모달 퍼포먼스 단축**: 
   - 현재 출력 전 표시되는 `PrintThumbnails` 생성 과정에서 다량의 DOM을 스케일링하므로 랜더링 랙이 체감됨. React Memo 등으로 렌더링 최적화 혹은 로딩 지연 기법 요구됨.
3. **오프라인 캐싱 (Local First)**: 
   - 웹 접속이 단절된 환경이나 Supabase 지연을 커버하기 위해 IndexedDB를 통한 Local-first 동기화 아키텍처 도입 논의.
