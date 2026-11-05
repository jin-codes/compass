import type { Answers, Item, Recommendation, Result } from "./types";

const EQUIPMENT_RANK = { phone: 0, laptop: 1, special: 2 } as const;

/** 외부 항목은 검수·출처·확인일이 있고 마감이 안 지났을 때만 게시한다. */
export function isPublishable(item: Item, today: string): boolean {
  if (!item.verified) return false;
  if (item.deadline && item.deadline < today) return false;
  if (item.kind !== "challenge" && (!item.sourceUrl || !item.lastChecked)) {
    return false;
  }
  return true;
}

function overlap(a: string[], b: string[]): string[] {
  return a.filter((x) => b.includes(x));
}

export function recommend(
  items: Item[],
  answers: Answers,
  today: string
): Result {
  const { fields, values, constraints } = answers;
  const published = items.filter((i) => isPublishable(i, today));
  const byId = new Map(published.map((i) => [i.id, i]));

  const supports = published.filter((i) => i.kind === "support");
  const candidates = published.filter((i) => i.kind !== "support");

  const within: Recommendation[] = [];
  const withSupport: Recommendation[] = [];

  for (const item of candidates) {
    const matchedFields = overlap(item.fields, fields);
    const matchedValues = overlap(item.values, values);
    // 흥미나 가치관 중 하나도 안 맞으면 추천하지 않는다.
    if (matchedFields.length + matchedValues.length === 0) continue;

    let score = matchedFields.length * 2 + matchedValues.length * 2;
    // 시간이 맞으면 가산, 넘으면 약간 감산 (숨기지는 않는다)
    if (item.hoursPerWeek <= constraints.hoursPerWeek) score += 1;
    else score -= 1;

    const overBudget =
      constraints.budget !== -1 && item.costKrw > constraints.budget;
    const overEquipment =
      EQUIPMENT_RANK[item.equipment] > EQUIPMENT_RANK[constraints.equipment];

    const rec: Recommendation = {
      item,
      score,
      matchedFields,
      matchedValues,
      cheaperAlt: item.cheaperAltId ? byId.get(item.cheaperAltId) : undefined,
    };

    if (overBudget || overEquipment) withSupport.push(rec);
    else within.push(rec);
  }

  const byScore = (a: Recommendation, b: Recommendation) =>
    b.score - a.score || a.item.costKrw - b.item.costKrw;
  within.sort(byScore);
  withSupport.sort(byScore);

  return { within, withSupport, supports };
}
