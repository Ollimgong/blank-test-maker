# CLAUDE.md

## 프로젝트 개요
영어학원용 **백지테스트 메이커** — Electron 데스크톱 앱으로, 시험지를 편집하고 A4로 인쇄하는 도구.

## 핵심 파일
- `src/blank_test_maker.jsx` — 유일한 소스 파일 (React 단일 컴포넌트)
- `src/main.jsx` — Vite 엔트리포인트
- `electron/main.js` — Electron 메인 프로세스 (파일 I/O, 윈도우, 메뉴, 인쇄)
- `electron/preload.js` — contextBridge로 renderer에 API 노출
- `docs/DESIGN_DECISIONS.md` — 설계 결정사항과 대화 히스토리

## 실행 환경
- **개발**: `npm run dev` (Vite HMR + Electron). React 코드 수정 시 자동 반영됨. 기본 개발 명령어.
- **빌드 후 실행**: `npm run electron:dev` (Vite 빌드 → Electron). HMR 없이 프로덕션 빌드 확인용.
- **배포 빌드**: `npm run dist:win` (Windows .exe) / `npm run dist:mac` (macOS .dmg)
- React 기본 훅만 사용 (useState, useEffect, useRef)
- 외부 라이브러리 없음 (Vite/React/Electron은 dev 의존성)
- 인라인 스타일 사용 (Tailwind 미사용)
- 폰트: Pretendard (CDN) + 커스텀 폰트 업로드 지원

## 데이터 구조 — 작업 폴더 기반
```
작업폴더/
  문법 기초/          ← 하위폴더 = 그룹
    수동태.btm        ← 1파일 = 1단원
    관계대명사.btm
  어휘/
    형용사.btm
```

### .btm 파일 (1파일 = 1단원)
```javascript
{
  title: "수동태",
  rows: [{               // 30행 고정
    id,
    l: { tag, mark, text, vis, bold, hdr, indent },  // 좌우 동일 구조
    r: { tag, mark, text, vis, bold, hdr, indent }   // indent=0/1/2 (들여쓰기 레벨)
  }],
  settings: { logo, slogan, customFont, customFontName, tags, numTagColor }
}
```

## 앱 모드
- **편집 모드**: 사이드바(파일 목록) + 에디터 + 미리보기 split. ANSWER/WORKSHEET 토글로 미리보기 전환
- **인쇄 모드**: 사이드바(단원별 A/W 체크박스, 그룹별 분류) + 선택된 페이지 썸네일 그리드. printToPDF → PDF 뷰어

## 작업 시 주의사항
1. **단일 파일 유지**: 앱 로직은 `blank_test_maker.jsx` 하나에 있어야 함
2. **A4 인쇄 최적화 필수**: 30행 고정, 행 높이 27px, 740x1046px 고정 레이아웃
3. **왼쪽/오른쪽 독립**: 셀 배경, 이동(▲▼), 헤더(H) 속성, 테두리 모두 각 칸 독립
4. **서버 없음**: 완전 클라이언트사이드, 서버 의존 코드 금지
5. **외부 의존 금지**: 런타임 외부 라이브러리 사용하지 않음

## 코드 구조 (blank_test_maker.jsx 내부)
```
상수/헬퍼          DEFAULT_TAGS, NO_TAG, tagColor(), emptyRow(), hdrRow(), padRows()
행 상수            TOTAL_ROWS=30, ROW_H=27
CellProps          셀 속성 팝오버 (태그/마커/들여쓰기 선택)
EditorCell         편집 셀 (왼쪽/오른쪽 독립, H/B/표시/▲▼)
EditorSideGroup    편집 영역 좌/우 컨테이너
Preview            A4 고정 크기 미리보기 (answer/worksheet 모드, 740x1046px)
PrintThumbnails    인쇄 모드 썸네일 그리드 (선택된 페이지만, 그룹별 표시)
App (default)      메인 앱 — 최상위 모드 탭(편집/인쇄) + 모드별 사이드바/콘텐츠
```

## Electron 구조
- `electron/main.js`: 작업 폴더 스캔, 파일 CRUD, 그룹(폴더) 관리, printToPDF, 마지막 폴더 기억
- `electron/preload.js`: selectFolder, scanFolder, readFile, writeFile, deleteFile, renameFile, printPreview 등
- 앱 설정 저장: `app.getPath("userData")/settings.json`
- `.btm` 파일 연결 (fileAssociations)

## 스토리지
- 작업 폴더 내 `.btm` 파일 (JSON)
- 편집 시 1초 debounce 자동저장
