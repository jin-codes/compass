import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeAnalysis } from "../lib/analyze.ts";
import type { Item } from "../lib/types.ts";

const ch = (id: string, o: Partial<Item> = {}): Item => ({
  id, kind: "challenge", name: id, summary: "", learns: "", fields: [], values: [],
  costKrw: 0, hoursPerWeek: 1, equipment: "phone", verified: true, ...o,
});
const items = [ch("a"), ch("b"), ch("c"), ch("d"), ch("pricey", { costKrw: 500000 })];

test("패턴 문장이 비면 null", () => {
  assert.equal(sanitizeAnalysis({ pattern: " ", nexts: [] }, items, []), null);
});

test("목록 밖·이미 한 것·비싼 것·중복 id는 버리고 최대 3개만 남긴다", () => {
  const raw = {
    pattern: "p",
    nexts: [
      { id: "fake", reason: "" }, { id: "a", reason: "r" }, { id: "a", reason: "r" },
      { id: "b", reason: "" }, { id: "pricey", reason: "" }, { id: "c", reason: "" }, { id: "d", reason: "" },
    ],
  };
  const r = sanitizeAnalysis(raw, items, ["b"]);
  assert.deepEqual(r?.nexts.map((n) => n.id), ["a", "c", "d"]);
});

test("빈 untouched·question은 붙이지 않는다", () => {
  const r = sanitizeAnalysis({ pattern: "p", untouched: "", question: "", nexts: [] }, items, []);
  assert.equal(r?.untouched, undefined);
  assert.equal(r?.question, undefined);
});
