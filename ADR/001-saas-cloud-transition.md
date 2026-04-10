# ADR-001: 클라우드 SaaS로의 전환 (Electron 폐기)

**작성/업데이트**: 2026-04-10  
**상태**: 채택 (Accepted)

## 배경 (Context)
초기 BTM 플랜은 강사들이 자신의 하드 디스크 "작업 폴더" 내부의 `.btm` 파일들을 로컬로 다룰 수 있도록 돕는 Electron 데스크톱 앱 솔루션이었습니다. 그러나 운영 체제별 패키징 부담, 접근성의 한계, 그리고 다른 강사들과의 자료 공유(워크스페이스)가 어렵다는 피드백이 축적되었습니다.

## 결정 (Decision)
- **Electron API 배제**: `ipcRenderer`, `fs(File System)` 등 플랫폼 종속 코드를 모두 삭제합니다.
- **Supabase 도입**: 파일 CRUD 및 사용자 설정(`tags`, `darkMode` 등)을 Supabase의 PostgreSQL DB와 Auth 인프라를 통해 핸들링하는 Cloud-Native SaaS 서비스로 전면 재편합니다.
- **Vercel 배포 타겟**: 로컬 `.exe` 배포가 아닌 URL 접근 방식을 채택합니다. Vercel 플랫폼을 1순위 프로덕션 타겟으로 삼습니다.

## 영향 (Consequences)
- (긍정) 언제 어디서나 링크 하나로 시험지를 생성하고 편집, 배포할 수 있습니다.
- (긍정) 설정 동기화가 쉬워졌습니다.
- (부정) 네트워크가 없는 초-오프라인 상태에서는 실행이 불가능해집니다. (향후 IndexedDB Local-first 로드맵으로 극복 예정)
