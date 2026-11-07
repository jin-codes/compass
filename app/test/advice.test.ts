import { test } from "node:test";
import assert from "node:assert/strict";
import { advise } from "../lib/advice.ts";
import type { Entry } from "../lib/log.ts";
import type { Item } from "../lib/types.ts";

const ch = (id: string, fields: string[], o: Partial<Item> = {}): Item => ({
  id,
  kind: "challenge",
  name: id,
  summary: "",
  learns: "",
  fields,
  values: [],
  costKrw: 0,
  hoursPerWeek: 1,
  equipment: "phone",
  verified: true,
  ...o,
});
const entry = (itemId?: string): Entry => ({
  id: Math.random().toString(),
  date: "2026-11-07",
  itemId,
  title: "t",
  note: "n",
});
const TODAY = "2026-11-07";

const items = [
  ch("a", ["데이터"]),
  ch("b", ["데이터"]),
  ch("c", ["데이터", "글"]),
  ch("d", ["디자인"], { costKrw: 5000 }),
  ch("e", ["사람"]),
];

test("도전과 이어진 기록이 없으면 조언하지 않는다", () => {
  assert.equal(advise([], items, [], TODAY), null);
  assert.equal(advise([entry(undefined), entry("zzz")], items, [], TODAY), null);
});

test("같은 도전을 여러 번 적어도 한 번으로 센다", () => {
  const r = advise([entry("a"), entry("a"), entry("a")], items, [], TODAY)!;
  assert.equal(r.doneCount, 1);
});

test("자주 닿은 분야를 더 깊게: 이미 해본 도전은 제안하지 않는다", () => {
  const r = advise([entry("a")], items, [], TODAY)!;
  assert.deepEqual(r.topFields, ["데이터"]);
  assert.ok(r.deeper.every((i) => i.id !== "a"));
  assert.deepEqual(r.deeper.map((i) => i.id).sort(), ["b", "c"]);
});

test("넓히기: 해본 분야와 겹치지 않는 것만, 끌린다고 고른 분야 먼저", () => {
  const r = advise([entry("a")], items, ["사람"], TODAY)!;
  assert.deepEqual(r.untouchedInterests, ["사람"]);
  assert.equal(r.broader[0].id, "e");
  assert.ok(r.broader.every((i) => !i.fields.includes("데이터")));
});

test("고른 분야를 이미 해봤으면 '아직 안 해본 분야'로 말하지 않는다", () => {
  const r = advise([entry("a")], items, ["데이터"], TODAY)!;
  assert.deepEqual(r.untouchedInterests, []);
});

test("미검증 도전은 제안하지 않는다", () => {
  const list = [...items, ch("x", ["사람"], { verified: false })];
  const r = advise([entry("a")], list, [], TODAY)!;
  assert.ok(r.broader.every((i) => i.id !== "x"));
});
