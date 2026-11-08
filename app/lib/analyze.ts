import type { Item } from "./types.ts";

/** 쌓인 기록을 종합한 읽기. 진단이 아니라 가설이고, 다음 시도는 검증된 목록 안의 id만 쓴다. */
export interface Analysis {
  pattern: string;
  untouched?: string;
  question?: string;
  nexts: { id: string; reason?: string }[];
}

/** 이 개수 미만이면 종합하지 않는다(섣부른 단정 방지). profile.ts의 MIN_FOR_READING과 같다. */
export const MIN_ENTRIES_FOR_ANALYSIS = 3;
export const MAX_ENTRIES_FOR_ANALYSIS = 30;
const MAX_NEXT_COST = 30000;

const clean = (x: unknown, max: number) => (typeof x === "string" ? x.trim().slice(0, max) : "");

/** AI 출력은 믿지 않는다. id는 목록과 대조하고, 한 도전과 비싼 도전은 뺀다. */
export function sanitizeAnalysis(raw: unknown, published: Item[], doneIds: string[]): Analysis | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const pattern = clean(r.pattern, 600);
  if (!pattern) return null;
  const allowed = new Set(
    published
      .filter((i) => i.kind === "challenge" && !doneIds.includes(i.id) && i.costKrw <= MAX_NEXT_COST)
      .map((i) => i.id)
  );
  const seen = new Set<string>();
  const nexts: Analysis["nexts"] = [];
  if (Array.isArray(r.nexts)) {
    for (const x of r.nexts) {
      const id = clean((x as { id?: unknown })?.id, 80);
      if (!allowed.has(id) || seen.has(id)) continue;
      seen.add(id);
      const reason = clean((x as { reason?: unknown }).reason, 160);
      nexts.push({ id, ...(reason ? { reason } : {}) });
      if (nexts.length === 3) break;
    }
  }
  const untouched = clean(r.untouched, 300);
  const question = clean(r.question, 100);
  return {
    pattern,
    ...(untouched ? { untouched } : {}),
    ...(question ? { question } : {}),
    nexts,
  };
}
