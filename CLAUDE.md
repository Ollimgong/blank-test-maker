# CLAUDE.md

## 프로젝트 개요
영어학원용 **백지테스트 메이커** — 브라우저에서 시험지를 편집하고 A4로 인쇄하는 도구.

## 핵심 파일
- `src/blank_test_maker.jsx` — 유일한 소스 파일 (React 단일 컴포넌트)
- `reference/*.pdf` — 기존 한글(HWP)로 제작한 원본 백지테스트 (디자인 참고용, 수정 금지)
- `docs/DESIGN_DECISIONS.md` — 설계 결정사항과 대화 히스토리

## 실행 환경
- Claude.ai Artifact (.jsx 렌더링)
- React 기본 훅만 사용 (useState, useEffect, useRef)
- 외부 라이브러리 없음
- 인라인 스타일 사용 (Tailwind 미사용)
- 데이터 저장: `window.storage` API (Claude Artifacts 전용)

## 작업 시 주의사항
1. **단일 파일 유지**: 모든 코드가 `blank_test_maker.jsx` 하나에 있어야 함
2. **A4 인쇄 최적화 필수**: 행 높이 27px 고정, overflow hidden, 전체 테이블 크기 고정
3. **왼쪽/오른쪽 독립**: 셀 배경, 이동(▲▼) 모두 각 칸 독립적으로 동작
4. **서버 없음**: 완전 클라이언트사이드, 서버 의존 코드 금지
5. **reference/ 디렉토리**: 읽기 전용 참고 자료, 코드에서 참조하지 않음

## 코드 구조 (blank_test_maker.jsx 내부)
```
상수/헬퍼          TAG_LIST, PTAG_LIST, tagColor(), emptyRow()
기본 데이터         PASSIVE_ROWS, RELATIVE_ROWS, DEFAULT_STATE
TagPicker          컬러칩 팝업 태그 선택 컴포넌트
EditorRow          편집 행 (왼쪽/오른쪽 독립 ▲▼, 2단계 삭제)
Preview            A4 미리보기 (답지/시험지 모드)
UnitItem           사이드바 단원 항목 (메뉴: 복제/삭제/그룹이동)
App (default)      메인 앱 — 사이드바 + 에디터 + 미리보기 분할
```

## 데이터 구조
```javascript
{
  groups: [{ id, name, collapsed }],
  units: [{
    id, groupId, title,
    headerL,  // 왼쪽 컬럼 헤더 (편집 가능, 기본: "SUMMARY")
    headerR,  // 오른쪽 컬럼 헤더 (편집 가능, 기본: "PRACTICE")
    rows: [{
      id,
      l: { tag, text, ans, bold },      // 왼쪽 셀
      r: { num, ptag, text, ans, bold }  // 오른쪽 셀
    }]
  }],
  settings: { logo, academyName }
}
```

## 스토리지 키
- `bt-v3` — 전체 데이터 (JSON)
