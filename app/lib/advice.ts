import type { Entry } from "./log.ts";
import { isPublishable } from "./recommend.ts";
import type { Item } from "./types.ts";

export interface Advice {
  /** 기록으로 이어진 도전 개수 (같은 도전을 여러 번 적어도 한 번으로 센다) */
  doneCount: number;
  /** 가장 자주 닿은 분야와 가치관. 순위가 아니라 "자주 나온 것"이다. */
  topFields: string[];
  topValues: string[];
  /** 끌린다고 골랐지만 아직 해본 기록이 없는 분야 */
  untouchedInterests: string[];
  /** 해본 분야에 다른 분야를 엮는 도전(융합). 여러 분야에 걸친 항목만 담는다. */
  blends: Item[];
}

/** 깊이 1·2·3의 내부 가중치. 학생에게 보이지 않는다. 도전 하나는 3(직접 해봄)으로 센다. */
export const DEPTH_WEIGHT = [1, 3, 6];

function tally(lists: string[][]): Map<string, number> {
  const m = new Map<string, number>();
  for (const list of lists) for (const x of list) m.set(x, (m.get(x) ?? 0) + 1);
  return m;
}

function top(m: Map<string, number>): string[] {
  const max = Math.max(0, ...m.values());
  if (max === 0) return [];
  return [...m].filter(([, n]) => n === max).map(([k]) => k).slice(0, 3);
}

/**
 * 기록(말한 나가 아니라 행동한 나)을 보고 다음 시도를 제안한다.
 * 도전과 이어지지 않은 직접 기록은 예시에서 골라 분야가 붙은 것만 센다.
 * 기록이 없으면 null. 점수·순위·연속 기록은 쓰지 않는다.
 */
export function advise(
  entries: Entry[],
  items: Item[],
  interestedFields: string[],
  today: string
): Advice | null {
  const byId = new Map(items.map((i) => [i.id, i]));
  const doneIds = new Set<string>();
  for (const e of entries) if (e.itemId && byId.has(e.itemId)) doneIds.add(e.itemId);
  // 예시에서 골라 적은 기록은 분야를 알 수 있으므로 깊이에 따라 가중해 함께 센다.
  const tagged = entries.filter((e) => !e.itemId && e.field && e.depth);
  if (doneIds.size === 0 && tagged.length === 0) return null;

  const done = [...doneIds].map((id) => byId.get(id)!);
  const fieldCounts = new Map<string, number>();
  for (const i of done)
    for (const f of i.fields) fieldCounts.set(f, (fieldCounts.get(f) ?? 0) + 3);
  for (const e of tagged)
    fieldCounts.set(
      e.field!,
      (fieldCounts.get(e.field!) ?? 0) + DEPTH_WEIGHT[e.depth! - 1]
    );
  const valueCounts = tally(done.map((i) => i.values));
  const topFields = top(fieldCounts);
  const topValues = top(valueCounts);
  const untouchedInterests = interestedFields.filter((f) => !fieldCounts.has(f));

  const open = items.filter(
    (i) => i.kind === "challenge" && !doneIds.has(i.id) && isPublishable(i, today)
  );

  // 융합: 해본 분야 하나 이상에 닿으면서 다른 분야와도 엮이는 도전을 먼저 고른다.
  // 끌린다고 고른 분야와 겹치면 앞으로, 같은 값이면 싼 것부터.
  const multi = open.filter((i) => i.fields.length >= 2);
  const touched = (i: Item) => i.fields.filter((f) => fieldCounts.has(f)).length;
  const fresh = (i: Item) => i.fields.length - touched(i);
  const wanted = (i: Item) => i.fields.filter((f) => untouchedInterests.includes(f)).length;
  const bridging = multi.filter((i) => touched(i) >= 1 && fresh(i) >= 1);
  const pool = bridging.length > 0 ? bridging : multi.filter((i) => touched(i) >= 1);
  const blends = (pool.length > 0 ? pool : multi)
    .sort(
      (a, b) =>
        wanted(b) - wanted(a) ||
        touched(b) - touched(a) ||
        fresh(b) - fresh(a) ||
        a.costKrw - b.costKrw
    )
    .slice(0, 3);

  return {
    doneCount: done.length,
    topFields,
    topValues,
    untouchedInterests,
    blends,
  };
}
