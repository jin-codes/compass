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

test("융합: 여러 분야에 걸친 것만, 이미 해본 도전은 제외", () => {
  const r = advise([entry("c")], items, [], TODAY)!;
  assert.ok(r.blends.every((i) => i.fields.length >= 2));
  assert.ok(r.blends.every((i) => i.id !== "c"));
});

test("융합: 해본 분야와 새 분야를 엮는 것을 먼저, 끌린다고 고른 분야가 겹치면 앞으로", () => {
  const list = [
    ch("dg", ["데이터", "글"]),
    ch("dp", ["데이터", "사람"]),
    ch("dd", ["데이터", "디자인"], { costKrw: 0 }),
    ch("pg", ["사람", "글"]),
  ];
  const r = advise([entry("a")], [...items, ...list], ["사람"], TODAY)!;
  assert.equal(r.blends[0].id, "dp");
  assert.ok(r.blends.every((i) => i.fields.includes("데이터")));
});

test("융합: 해본 분야가 없는 도전뿐이면 여러 분야 도전을 싼 순서로 보여준다", () => {
  const list = [ch("x", ["사람", "글"], { costKrw: 9000 }), ch("y", ["디자인", "글"])];
  const r = advise([entry("a")], [ch("a", ["데이터"]), ...list], [], TODAY)!;
  assert.deepEqual(r.blends.map((i) => i.id), ["y", "x"]);
});

test("고른 분야를 이미 해봤으면 '아직 안 해본 분야'로 말하지 않는다", () => {
  const r = advise([entry("a")], items, ["데이터"], TODAY)!;
  assert.deepEqual(r.untouchedInterests, []);
});

test("미검증 도전은 제안하지 않는다", () => {
  const list = [...items, ch("x", ["사람"], { verified: false })];
  const r = advise([entry("a")], list, [], TODAY)!;
  assert.ok(r.blends.every((i) => i.id !== "x"));
});
