import { padRows, hdrRow, mk } from "./btmHelpers.js";

export const DEFAULT_TAGS = [
  { v: "개념", c: "#2563EB", tx: "#fff" },
  { v: "형태", c: "#ec6619", tx: "#fff" },
  { v: "예문", c: "#059669", tx: "#fff" },
  { v: "주의", c: "#dc2626", tx: "#fff" },
  { v: "예시", c: "#7e7e7f", tx: "#fff" },
];

export const NO_TAG = { v: "", label: "태그 없음", c: "#cbd5e1", tx: "#6b7280" };

export const TOTAL_ROWS = 30; // A4 fixed row count
export const ROW_H = 27; // fixed row height (px) — notebook-ruled feel

export const CELL_STYLE = {
  minHeight: `${ROW_H}px`,
  maxHeight: `${ROW_H}px`,
  padding: "4px 8px",
};

export const TEXT_CLIP = { 
  overflow: "hidden", 
  textOverflow: "ellipsis", 
  whiteSpace: "nowrap", 
  display: "block", 
  maxWidth: "100%" 
};

export const PASSIVE_ROWS = [
  hdrRow("SUMMARY", "PRACTICE"),
  mk({ x: "능동: 주어가 동사를 직접 함", a: 1 }, { x: "## 영작 & 수동태 전환 연습" }),
  mk({ x: "수동: 주어가 동사를 다른 행위자에 의해 당함", a: 1 }, { x: "1 나의 친구들은 나를 사랑한다." }),
  mk({}, { x: "[영작] My friends love me.", a: 1 }),
  mk({ x: "## 능동태 -> 수동태 전환방법" }, { x: "[수동태] I am loved by my friends.", a: 1 }),
  mk({ x: "@예문 She wrote a letter.", a: 1 }, { x: "2 나는 접시들을 씻는다." }),
  mk({ x: "1) 능동태의 주어, 동사, 목적어를 찾는다.", a: 1 }, { x: "[영작] I wash the dishes.", a: 1 }),
  mk({ x: "=> 주어: She / 동사: wrote / 목적어: a letter", a: 1 }, { x: "[수동태] The dishes are washed by me.", a: 1 }),
  mk({ x: "2) 능동태의 시제를 파악한다.", a: 1 }, { x: "3 그는 창문을 닫았다." }),
  mk({ x: "=> 과거", a: 1 }, { x: "[영작] He closed the window.", a: 1 }),
  mk({ x: "3) 능동태의 목적어를 수동태의 주어 자리에 쓴다.", a: 1 }, { x: "[수동태] The window was closed by him.", a: 1 }),
  mk({ x: "=> A letter", a: 1 }, { x: "4 Joy는 컵들을 깼다." }),
  mk({ x: "4) be동사를 수/시제에 맞게 쓴다.", a: 1 }, { x: "[영작] Joy broke the cups.", a: 1 }),
  mk({ x: "=> A letter was", a: 1 }, { x: "[수동태] The cups were broken by Joy.", a: 1 }),
  mk({ x: "5) 동사를 p.p형태로 바꾼다.", a: 1 }, { x: "5 그녀는 파티를 개최할 것이다." }),
  mk({ x: "=> A letter was written", a: 1 }, { x: "[영작] She will hold a party.", a: 1 }),
  mk({ x: "6) by + 원래 주어를 목적격으로 쓴다.", a: 1 }, { x: "[수동태] A party will be held by her.", a: 1 }),
  mk({ x: "=> A letter was written by her.", a: 1 }, { x: "6 할머니는 케이크를 구울 것이다." }),
  mk({ x: "@주의 A letter was written by she. (X)", a: 1 }, { x: "[영작] Grandma will bake the cake.", a: 1 }),
  mk({}, { x: "[수동태] The cake will be baked by Grandma.", a: 1 }),
  mk({ x: "## by + 목적격의 생략" }, { x: "7 사람들은 미국에서 영어를 말한다." }),
  mk({ x: "@개념 행위자가 분명하지 않거나 중요하지 않을 때", a: 1 }, { x: "[영작] People speak English in America.", a: 1 }),
  mk({ x: "by + 목적격은 생략할 수 있다", a: 1 }, { x: "[수동태] English is spoken in America.", a: 1 }),
  mk({ x: "@예문 Someone planted the tree in 1995.", a: 1 }, {}),
  mk({ x: "=> The tree was planted in 1995.", a: 1 }, {}),
];

export const RELATIVE_ROWS = [
  hdrRow("SUMMARY", "PRACTICE"),
  mk({ x: "관계대명사는 [[접속사 + 대명사]] 의 역할을 하며", a: 1 }, { x: "## 영작연습" }),
  mk({ x: "관계대명사가 이끄는 절은 앞의 명사(선행사)를 수식한다", a: 1, i: 1 }, { x: "1 나는 착한 소년을 안다." }),
  mk({ x: "## 주격관계대명사" }, { x: "(1) I know a boy.", a: 1 }),
  mk({ x: "@개념 주격관계대명사는 관계대명사가 이끄는 절에서", a: 1 }, { x: "(2) The boy is kind.", a: 1 }),
  mk({ x: "주어의 역할을 한다", a: 1, i: 1 }, { x: "=> I know a boy ( who is kind ).", a: 1 }),
  mk({ x: "@형태 - 선행사가 사람일 때 : who", a: 1 }, { x: "2 그는 내가 믿는 친구를 가지고 있다." }),
  mk({ x: "- 선행사가 사람이 아닐 때 : which", a: 1 }, { x: "(1) He has a friend.", a: 1 }),
  mk({ x: "@예문 She is a girl ( who likes pasta ).", a: 1 }, { x: "(2) I trust the friend.", a: 1 }),
  mk({ x: "선행사 (사람O)", a: 1 }, { x: "=> He has a friend ( who(m) I trust ).", a: 1 }),
  mk({ x: "@예문 This is a house ( which is expensive ).", a: 1 }, { x: "3 우리는 빠른 차를 봤다." }),
  mk({ x: "선행사 (사람X)", a: 1 }, { x: "(1) We saw a car.", a: 1 }),
  mk({ x: "## 목적격관계대명사" }, { x: "(2) The car was fast.", a: 1 }),
  mk({ x: "@개념 목적격관계대명사는 관계대명사가 이끄는 절에서", a: 1 }, { x: "=> We saw a car ( which was fast ).", a: 1 }),
  mk({ x: "목적어의 역할을 한다", a: 1, i: 1 }, { x: "4 우리가 어제 만난 그 선생님은 착하다." }),
  mk({ x: "@형태 - 선행사가 사람일 때 : who / whom", a: 1 }, { x: "(1) The teacher is kind.", a: 1 }),
  mk({ x: "- 선행사가 사람이 아닐 때 : which", a: 1 }, { x: "(2) We met the teacher yesterday.", a: 1 }),
  mk({ x: "@예문 She is a girl ( who(m) I like ).", a: 1 }, { x: "=> The teacher ( who(m) we met yesterday )", a: 1 }),
  mk({ x: "선행사 (사람O)", a: 1 }, { x: "is kind.", a: 1 }),
  mk({ x: "@예문 This is a house ( which Joy bought ).", a: 1 }, { x: "5 그는 머리가 긴 소녀를 만났다." }),
  mk({ x: "선행사 (사람X)", a: 1 }, { x: "(1) He met a girl.", a: 1 }),
  mk({ x: "## 소유격관계대명사" }, { x: "(2) Her hair is long.", a: 1 }),
  mk({ x: "@개념 소유격관계대명사는 관계대명사가 이끄는 절에서", a: 1 }, { x: "=> He met a girl ( whose hair is long ).", a: 1 }),
  mk({ x: "소유격 역할을 한다", a: 1, i: 1 }, { x: "6 그는 부산에서 일하는 의사를 안다." }),
  mk({ x: "@형태 선행사와 상관없이 whose", a: 1 }, { x: "(1) He knows a doctor.", a: 1 }),
  mk({ x: "@예문 She is a girl ( whose hair is long ).", a: 1 }, { x: "(2) The doctor works in Busan.", a: 1 }),
  mk({ x: "@예문 This is a house ( whose roof is red ).", a: 1 }, { x: "=> He knows a doctor ( who works in Busan ).", a: 1 }),
];

export const DEFAULT_SETTINGS = { tags: DEFAULT_TAGS };
export const DEFAULT_UNIT = { title: "새 단원", rows: padRows([hdrRow("SUMMARY", "PRACTICE")], TOTAL_ROWS) };
