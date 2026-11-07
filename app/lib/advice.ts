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
  /** 자주 닿은 분야를 더 깊게 */
  deeper: Item[];
  /** 아직 닿지 않은 분야로 넓히기 */
  broader: Item[];
}

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
 * 도전과 이어지지 않은 직접 기록은 분야를 알 수 없어 세지 않는다.
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
  if (doneIds.size === 0) return null;

  const done = [...doneIds].map((id) => byId.get(id)!);
  const fieldCounts = tally(done.map((i) => i.fields));
  const valueCounts = tally(done.map((i) => i.values));
  const topFields = top(fieldCounts);
  const topValues = top(valueCounts);
  const untouchedInterests = interestedFields.filter((f) => !fieldCounts.has(f));

  const open = items.filter(
    (i) => i.kind === "challenge" && !doneIds.has(i.id) && isPublishable(i, today)
  );

  const deeper = open
    .filter((i) => i.fields.some((f) => topFields.includes(f)))
    .sort(
      (a, b) =>
        b.fields.filter((f) => topFields.includes(f)).length -
          a.fields.filter((f) => topFields.includes(f)).length ||
        a.costKrw - b.costKrw
    )
    .slice(0, 2);

  // 넓히기: 해본 분야와 겹치지 않는 것. 끌린다고 고른 분야가 있으면 그쪽을 먼저.
  const fresh = open.filter((i) => !i.fields.some((f) => fieldCounts.has(f)));
  const byCost = (a: Item, b: Item) => a.costKrw - b.costKrw;
  const wanted = fresh
    .filter((i) => i.fields.some((f) => untouchedInterests.includes(f)))
    .sort(byCost);
  const rest = fresh.filter((i) => !wanted.includes(i)).sort(byCost);
  const broader = [...wanted, ...rest].slice(0, 2);

  return {
    doneCount: done.length,
    topFields,
    topValues,
    untouchedInterests,
    deeper,
    broader,
  };
}
