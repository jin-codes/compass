import { FIELD_OPTIONS, VALUE_OPTIONS } from "./items.ts";
import { isPublishable, recommend } from "./recommend.ts";
import type { Constraints, Item } from "./types.ts";

/** AI가 읽어낸 것. AI가 못 쓰는 환경에서는 키워드로 읽은 것이 같은 모양으로 들어온다. */
export interface Reading {
  fields: string[];
  values: string[];
  /** 목록 안의 항목에 대해 AI가 쓴 한두 문장. id는 목록에 있는 것만 살린다. */
  reasons: { id: string; reason: string }[];
}

export interface Pick {
  id: string;
  reason?: string;
}

export interface Suggestion {
  mode: "ai" | "basic";
  fields: string[];
  values: string[];
  within: Pick[];
  withSupport: Pick[];
  supports: string[];
  /** 말한 분야와 겹치지 않는 쪽의 도전 하나 */
  widen?: Pick;
  /** AI를 쓸 수 있었지만 사용 한도 때문에 키워드로 읽었다 */
  busy?: boolean;
}

const FIELD_WORDS: Record<string, string[]> = {
  "데이터·분석": ["데이터", "통계", "분석", "그래프", "숫자", "조사"],
  "소프트웨어·만들기": ["코딩", "코드", "프로그래밍", "앱", "웹", "개발", "프로그램", "해킹"],
  "글·콘텐츠": ["글", "쓰기", "쓰는", "영상", "유튜브", "블로그", "콘텐츠", "편집", "기사"],
  "디자인·시각": ["디자인", "그림", "사진", "포스터", "그리", "시각"],
  "사람·상담": ["상담", "사람", "친구", "대화", "듣", "고민", "심리", "가르치"],
  "과학·실험": ["과학", "실험", "물리", "화학", "생물", "관찰", "가설"],
  "사회·환경 문제": ["환경", "사회", "기후", "불편", "봉사", "지역", "쓰레기"],
  "기획·창업": ["창업", "기획", "아이디어", "사업", "서비스"],
};

const VALUE_WORDS: Record<string, string[]> = {
  "누군가를 돕는 일": ["돕", "도움", "봉사", "위로"],
  "깊이 파고드는 탐구": ["파고", "탐구", "궁금", "깊이", "연구"],
  "직접 만들어 내놓기": ["만들", "내놓", "출시", "공개", "완성"],
  "나를 표현하기": ["표현", "나만의", "내 이야기", "개성"],
  "함께 만들기": ["같이", "함께", "팀", "협업"],
  "안정과 예측 가능함": ["안정", "꾸준", "규칙", "계획", "루틴"],
};

function hits(text: string, words: Record<string, string[]>): string[] {
  return Object.keys(words).filter((k) => words[k].some((w) => text.includes(w)));
}

/** AI를 못 쓸 때의 대비. 말에서 단어를 찾는 정도라 정확하지 않다. */
export function readBasic(text: string): Reading {
  return { fields: hits(text, FIELD_WORDS), values: hits(text, VALUE_WORDS), reasons: [] };
}

/** AI 출력은 믿지 않고 목록과 선택지 안의 것만 남긴다. */
export function sanitize(raw: unknown, published: Item[]): Reading {
  const r = (raw ?? {}) as Partial<Reading>;
  const ids = new Set(published.map((i) => i.id));
  const keep = (xs: unknown, allowed: string[]) =>
    Array.isArray(xs)
      ? [...new Set(xs.filter((x): x is string => typeof x === "string" && allowed.includes(x)))]
      : [];
  const seen = new Set<string>();
  const reasons: Reading["reasons"] = [];
  if (Array.isArray(r.reasons)) {
    for (const x of r.reasons) {
      if (!x || typeof x.id !== "string" || typeof x.reason !== "string") continue;
      if (!ids.has(x.id) || seen.has(x.id)) continue;
      const reason = x.reason.trim().slice(0, 160);
      if (!reason) continue;
      seen.add(x.id);
      reasons.push({ id: x.id, reason });
      if (reasons.length === 6) break;
    }
  }
  return {
    fields: keep(r.fields, FIELD_OPTIONS),
    values: keep(r.values, VALUE_OPTIONS),
    reasons,
  };
}

/**
 * 말한 분야와 겹치지 않는 도전 중 하나. 시야를 넓히는 갈래.
 * 예산을 넘는 것은 제외하고, 가치관이 닿는 것을 먼저, 그다음 싼 것을 고른다.
 */
export function pickWiden(
  items: Item[],
  fields: string[],
  values: string[],
  constraints: Constraints,
  today: string
): Item | undefined {
  const pool = items.filter(
    (i) =>
      i.kind === "challenge" &&
      isPublishable(i, today) &&
      !i.fields.some((f) => fields.includes(f)) &&
      (constraints.budget === -1 || i.costKrw <= constraints.budget)
  );
  return pool.sort(
    (a, b) =>
      b.values.filter((v) => values.includes(v)).length -
        a.values.filter((v) => values.includes(v)).length || a.costKrw - b.costKrw
  )[0];
}

export function build(
  items: Item[],
  reading: Reading,
  constraints: Constraints,
  today: string,
  mode: Suggestion["mode"]
): Suggestion {
  const result = recommend(
    items,
    { fields: reading.fields, values: reading.values, constraints },
    today
  );
  const reasonOf = new Map(reading.reasons.map((r) => [r.id, r.reason]));
  const pick = (id: string): Pick => ({ id, reason: reasonOf.get(id) });
  // AI가 이유를 쓴 항목을 먼저 보여준다. 같은 조건이면 기존 순서를 지킨다(정렬은 안정적이다).
  const reasonFirst = <T extends { item: Item }>(recs: T[]): T[] =>
    [...recs].sort((a, b) => Number(reasonOf.has(b.item.id)) - Number(reasonOf.has(a.item.id)));
  const widen = pickWiden(items, reading.fields, reading.values, constraints, today);
  return {
    mode,
    fields: reading.fields,
    values: reading.values,
    within: reasonFirst(result.within).slice(0, 3).map((r) => pick(r.item.id)),
    withSupport: reasonFirst(result.withSupport).slice(0, 2).map((r) => pick(r.item.id)),
    supports: result.supports.map((s) => s.id),
    widen: widen ? pick(widen.id) : undefined,
  };
}
