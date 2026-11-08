import { readBasic } from "./suggest.ts";
import type { Item } from "./types.ts";

/** 방금 적은 기록에 대한 짧은 반응. 다음 시도는 검증된 목록 안의 id만 쓴다. */
export interface Reflection {
  mode: "ai" | "basic";
  noticed: string;
  next?: { id: string; reason?: string };
  /** 그 경험에서 느낀 점을 묻는 질문 하나. 답은 학생이 원할 때만 기록에 붙는다. */
  question?: string;
}

export const BASIC_QUESTION = "하면서 가장 기억에 남은 순간은 뭐였어? 그때 어떤 기분이 들었어?";

/** 너무 비싼 활동은 이 자리에서 밀지 않는다. 비싼 것은 찾기 화면에서 지원 안내와 함께 본다. */
const MAX_NEXT_COST = 30000;

function candidates(published: Item[], doneIds: string[]): Item[] {
  return published.filter(
    (i) => i.kind === "challenge" && !doneIds.includes(i.id) && i.costKrw <= MAX_NEXT_COST
  );
}

/** AI를 못 쓸 때의 대비. 적은 말에서 분야를 찾아 같은 분야의 싼 도전을 붙인다. */
export function basicReflect(
  title: string,
  note: string,
  published: Item[],
  doneIds: string[]
): Reflection {
  const { fields } = readBasic(`${title} ${note}`);
  const pool = candidates(published, doneIds);
  const same = pool.filter((i) => i.fields.some((f) => fields.includes(f)));
  const next = [...same].sort((a, b) => a.costKrw - b.costKrw)[0];
  return {
    mode: "basic",
    noticed: "해본 일이 기록으로 남았어. 쌓이면 어느 쪽에 자주 닿는지 볼 수 있어.",
    question: BASIC_QUESTION,
    ...(next ? { next: { id: next.id } } : {}),
  };
}

/** AI 출력은 믿지 않는다. id는 목록과 대조하고 글자 수를 제한한다. */
export function sanitizeReflect(
  raw: unknown,
  published: Item[],
  doneIds: string[]
): Reflection | null {
  const r = (raw ?? {}) as {
    noticed?: unknown;
    fields?: unknown;
    question?: unknown;
    next?: { id?: unknown; reason?: unknown };
  };
  const question = typeof r.question === "string" ? r.question.trim().slice(0, 100) : "";
  const noticed = typeof r.noticed === "string" ? r.noticed.trim().slice(0, 220) : "";
  if (!noticed) return null;
  const allowed = new Set(candidates(published, doneIds).map((i) => i.id));
  const id = typeof r.next?.id === "string" ? r.next.id : "";
  const reason = typeof r.next?.reason === "string" ? r.next.reason.trim().slice(0, 160) : "";
  return {
    mode: "ai",
    noticed,
    ...(question ? { question } : {}),
    ...(allowed.has(id) ? { next: { id, ...(reason ? { reason } : {}) } } : {}),
  };
}
