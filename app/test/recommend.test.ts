import { test } from "node:test";
import assert from "node:assert/strict";
import { isPublishable, recommend } from "../lib/recommend.ts";
import type { Item } from "../lib/types.ts";

const base: Item = {
  id: "a",
  kind: "challenge",
  name: "a",
  summary: "",
  learns: "",
  fields: ["코딩"],
  values: [],
  costKrw: 0,
  hoursPerWeek: 2,
  equipment: "phone",
  verified: true,
};
const ext = (o: Partial<Item>): Item => ({
  ...base,
  kind: "contest",
  sourceUrl: "https://example.com",
  lastChecked: "2026-11-06",
  ...o,
});
const answers = (budget: 0 | 30000 | 100000 | -1 = 0) => ({
  fields: ["코딩"],
  values: [],
  constraints: { budget, hoursPerWeek: 2, equipment: "phone" as const },
});
const TODAY = "2026-11-06";

test("미검증 항목은 게시하지 않는다", () => {
  assert.equal(isPublishable({ ...base, verified: false }, TODAY), false);
});

test("마감이 지난 항목은 숨기고, 오늘 마감은 보인다", () => {
  assert.equal(isPublishable(ext({ deadline: "2026-11-05" }), TODAY), false);
  assert.equal(isPublishable(ext({ deadline: "2026-11-06" }), TODAY), true);
});

test("외부 항목은 출처와 확인일이 없으면 게시하지 않는다", () => {
  assert.equal(isPublishable(ext({ sourceUrl: undefined }), TODAY), false);
  assert.equal(isPublishable(ext({ lastChecked: undefined }), TODAY), false);
});

test("예산을 넘는 항목은 숨기지 않고 '지원받으면 가능한 길'로 간다", () => {
  const r = recommend([{ ...base, costKrw: 50000 }], answers(0), TODAY);
  assert.equal(r.within.length, 0);
  assert.equal(r.withSupport.length, 1);
});

test("흥미·가치관이 하나도 안 맞으면 추천하지 않는다", () => {
  const r = recommend([{ ...base, fields: ["디자인"] }], answers(), TODAY);
  assert.equal(r.within.length + r.withSupport.length, 0);
});
