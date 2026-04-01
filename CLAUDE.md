# CLAUDE.md

## 프로젝트 개요
영어학원용 **백지테스트 메이커** — 브라우저에서 시험지를 편집하고 A4로 인쇄하는 도구.

## 핵심 파일
- `src/blank_test_maker.jsx` — 유일한 소스 파일 (React 단일 컴포넌트)
- `src/main.jsx` — Vite 엔트리포인트 (window.storage 폴리필 포함)
- `reference/*.pdf` — 기존 한글(HWP)로 제작한 원본 백지테스트 (디자인 참고용, 수정 금지)
- `docs/DESIGN_DECISIONS.md` — 설계 결정사항과 대화 히스토리

## 실행 환경
- **로컬 개발**: Vite + React (`npm run dev` → http://localhost:5173)
- **Claude.ai Artifact**: .jsx 렌더링 (window.storage API 사용)
- React 기본 훅만 사용 (useState, useEffect, useRef)
- 외부 라이브러리 없음 (Vite/React는 dev 의존성)
- 인라인 스타일 사용 (Tailwind 미사용)
- 폰트: Pretendard (CDN) + 커스텀 폰트 업로드 지원
- 데이터 저장: `window.storage` API (Artifacts) / `localStorage` (로컬)

## 작업 시 주의사항
1. **단일 파일 유지**: 앱 로직은 `blank_test_maker.jsx` 하나에 있어야 함
2. **A4 인쇄 최적화 필수**: 30행 고정, 행 높이 27px, 740x1046px 고정 레이아웃
3. **왼쪽/오른쪽 독립**: 셀 배경, 이동(▲▼), 헤더(H) 속성, 테두리 모두 각 칸 독립
4. **서버 없음**: 완전 클라이언트사이드, 서버 의존 코드 금지
5. **reference/ 디렉토리**: 읽기 전용 참고 자료, 코드에서 참조하지 않음

## 코드 구조 (blank_test_maker.jsx 내부)
```
상수/헬퍼          DEFAULT_TAGS, NO_TAG, tagColor(), emptyRow(), hdrRow(), padRows()
행 상수            TOTAL_ROWS=30, ROW_H=27
기본 데이터         PASSIVE_ROWS, RELATIVE_ROWS, DEFAULT_STATE
TagPicker          컬러칩 팝업 태그 선택 컴포넌트
EditorRow          편집 행 (왼쪽/오른쪽 독립 ▲▼, H/B/답 토글)
Preview            A4 고정 크기 미리보기 (답지/시험지 모드, 740x1046px)
UnitItem           사이드바 단원 항목 (메뉴: 복제/삭제/그룹이동)
App (default)      메인 앱 — 사이드바 + 에디터 + 미리보기 분할
```

## 데이터 구조
```javascript
{
  groups: [{ id, name, collapsed }],
  units: [{
    id, groupId, title,
    rows: [{               // 30행 고정
      id,
      l: { tag, mark, text, ans, bold, hdr, indent },  // 좌우 동일 구조
      r: { tag, mark, text, ans, bold, hdr, indent }   // indent=0/1/2 (들여쓰기 레벨)
    }]
  }],
  settings: { logo, slogan, customFont, customFontName, tags }
}
```

## 스토리지 키
- `bt-v3` — 전체 데이터 (JSON)
