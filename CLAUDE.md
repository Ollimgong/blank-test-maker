# CLAUDE.md

## 프로젝트 개요
영어학원용 **백지테스트 메이커** — Electron 데스크톱 앱으로, 시험지를 편집하고 A4로 인쇄하는 도구.

## 핵심 파일
- `src/blank_test_maker.jsx` — 유일한 소스 파일 (React 단일 컴포넌트)
- `src/main.jsx` — Vite 엔트리포인트
- `electron/main.js` — Electron 메인 프로세스 (파일 I/O, 윈도우, 메뉴, 인쇄)
- `electron/preload.js` — contextBridge로 renderer에 API 노출

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
- **편집 모드**: 사이드바(파일 목록) + 3열 에디터(편집|ANSWER|WORKSHEET). 같은 행이 한 줄에 정렬되는 인라인 프리뷰 방식. A4 미리보기 모달에서 바로 출력 가능 (답지만/시험지만/둘 다).
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
EditorCell         편집 셀 (H/B/표시 버튼은 hover 시에만 표시)
InlinePreviewCell  편집 행과 나란히 보여주는 셀 미리보기 (ANSWER/WORKSHEET)
Preview            A4 고정 크기 미리보기 (인쇄용, 740x1046px)
PrintThumbnails    인쇄 모드 썸네일 그리드 (선택된 페이지만, 그룹별 표시)
App (default)      메인 앱 — 헤더(모드 탭) + 모드별 사이드바/콘텐츠
```

## 편집 모드 레이아웃
```
┌───────────────────────────────────────────────────┐
│ 백지테스트 메이커 │ 편집 │ 인쇄 │    📁폴더변경 ⚙설정 │  ← 헤더 (1줄)
├──────┬────────────────────────────────────────────┤
│사이드 │ 단원명: [수동태_________]                    │  ← sticky 단원명
│바     │ 편집        │ ANSWER    │ WORKSHEET        │  ← sticky 열 헤더
│(파일  │─────────────┼───────────┼──────────────────│
│ 목록) │ [에디터셀]  │ [프리뷰]  │ [프리뷰]          │  ← 60행 단일 스크롤
│      │ ...         │ ...       │ ...               │
└──────┴────────────────────────────────────────────┘
```

## 들여쓰기
- 단순 왼쪽 패딩 방식 (indent 0/1/2 → 0/16/32px)
- Tab/Shift+Tab으로 조절, 제한 없음
- ghost 상속 시스템: 들여쓰기된 행에서 부모 태그/마커를 invisible spacer로 렌더링해 텍스트 정렬 (getGhosts 함수)

## Electron 구조
- `electron/main.js`: 작업 폴더 스캔, 파일 CRUD, 그룹(폴더) 관리, printToPDF, 마지막 폴더 기억
- `electron/preload.js`: selectFolder, scanFolder, readFile, writeFile, deleteFile, renameFile, printPreview 등
- 앱 설정 저장: `app.getPath("userData")/settings.json`
- `.btm` 파일 연결 (fileAssociations)

## 스토리지
- 작업 폴더 내 `.btm` 파일 (JSON)
- 편집 시 1초 debounce 자동저장

## 미해결 백로그
- **들여쓰기 정렬 개선**: 현재 단순 패딩이라 부모 태그/마커 너비만큼 정확히 정렬되지 않음. 더 나은 정렬 방식 필요.
- **사이드바 너비 개선**: 210px 고정 → 넓히거나 리사이즈 가능하게. 파일명 잘림 문제.
- **파일 컨텍스트 메뉴 개선**: ⋯ 버튼이 작고 발견하기 어려움. 우클릭 메뉴 추가 or hover 시 더 명확하게.
- **빈 행 구분 강화**: 프리뷰에서 내용 있는 행과 빈 행의 시각 차이 강화.
- **인쇄 미리보기 창 성능**: PDF 생성 → 미리보기 창 표시까지 체감 지연 있음. Electron printToPDF 파이프라인 한계.

## 커밋/푸시 전 체크리스트
- CLAUDE.md의 내용이 현재 코드와 일치하는지 확인하고, 달라진 부분이 있으면 반영한 뒤 커밋할 것.
- README.md의 내용(기능 설명, 프로젝트 구조 등)이 현재 코드와 일치하는지 확인하고, 달라진 부분이 있으면 반영한 뒤 커밋할 것.
