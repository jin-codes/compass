import { DEPTH_WEIGHT } from "./advice.ts";
import { DIMS } from "./examples.ts";
import type { DimCode } from "./examples.ts";
import type { Entry } from "./log.ts";

export type Stage = "taste" | "growing" | "deep";

export interface Profile {
  /** 분석에 쓸 수 있는(예시로 분야가 붙은) 기록 수 */
  taggedCount: number;
  /** 활동에서 읽히는 경향 최대 3개. 기록이 3개 미만이면 비운다(섣부른 단정 방지). */
  leanings: DimCode[];
  /** 분야별 깊이. 점수는 내보내지 않고 단계로만 낸다. */
  fieldStages: { field: string; stage: Stage }[];
  /** 서로 다른 분야 수 */
  breadth: number;
  /** 첫 기록과 마지막 기록 사이 일수 */
  spanDays: number;
  /** 결과물을 내거나 꾸준히 이어간 일(깊이 3)의 개수 */
  outputCount: number;
  /** 함께한 일이 많은지 혼자 한 일이 많은지. 기록이 3개 미만이면 null */
  style: "together" | "alone" | "mixed" | null;
}

export const MIN_FOR_READING = 3;

function stageOf(score: number): Stage {
  return score >= 8 ? "deep" : score >= 3 ? "growing" : "taste";
}

/**
 * 예시로 골라 적은 기록에서 경향과 깊이를 읽는다. 진단이 아니라 가설이고,
 * 서열·비교·연속 출석을 만들지 않는다. 오직 이 학생 자신의 기록만 본다.
 */
export function profile(entries: Entry[]): Profile | null {
  const tagged = entries.filter(
    (e) => !e.itemId && e.field && e.depth && e.depth >= 1 && e.depth <= 3
  );
  if (tagged.length === 0) return null;

  const fieldScore = new Map<string, number>();
  const dimScore = new Map<DimCode, number>();
  let together = 0;
  for (const e of tagged) {
    const w = DEPTH_WEIGHT[e.depth! - 1];
    fieldScore.set(e.field!, (fieldScore.get(e.field!) ?? 0) + w);
    for (const d of e.dims ?? []) {
      if (d in DIMS) dimScore.set(d as DimCode, (dimScore.get(d as DimCode) ?? 0) + w);
    }
    if (e.dims?.includes("C")) together++;
  }

  const enough = tagged.length >= MIN_FOR_READING;
  const leanings = enough
    ? [...dimScore]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([d]) => d)
    : [];

  const times = tagged.map((e) => Date.parse(e.date)).filter((t) => !isNaN(t));
  const spanDays = times.length
    ? Math.round((Math.max(...times) - Math.min(...times)) / 86400000)
    : 0;

  const share = together / tagged.length;
  const style = !enough ? null : share >= 0.4 ? "together" : share === 0 ? "alone" : "mixed";

  return {
    taggedCount: tagged.length,
    leanings,
    fieldStages: [...fieldScore]
      .sort((a, b) => b[1] - a[1])
      .map(([field, s]) => ({ field, stage: stageOf(s) })),
    breadth: fieldScore.size,
    spanDays,
    outputCount: tagged.filter((e) => e.depth === 3).length,
    style,
  };
}
