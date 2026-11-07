import { test } from "node:test";
import assert from "node:assert/strict";
import { build, pickWiden, readBasic, sanitize } from "../lib/suggest.ts";
import type { Reading } from "../lib/suggest.ts";
import type { Constraints, Item } from "../lib/types.ts";

const TODAY = "2026-11-07";
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
const free: Constraints = { budget: 0, hoursPerWeek: 4, equipment: "phone" };

const items = [
  ch("data1", ["데이터·분석"]),
  ch("data2", ["데이터·분석", "과학·실험"]),
  ch("write", ["글·콘텐츠"], { values: ["나를 표현하기"] }),
  ch("people", ["사람·상담"], { values: ["누군가를 돕는 일"], costKrw: 5000 }),
  ch("hidden", ["사람·상담"], { verified: false }),
];

test("AI 출력에서 선택지와 목록 밖의 것은 버린다", () => {
  const r = sanitize(
    {
      fields: ["데이터·분석", "의사", 3],
      values: ["나를 표현하기", "돈 많이 벌기"],
      reasons: [
        { id: "data1", reason: "  숫자 얘기를 했어  " },
        { id: "ghost", reason: "목록에 없는 항목" },
        { id: "hidden", reason: "미검증 항목" },
        { id: "data1", reason: "중복" },
        { id: "write", reason: "" },
      ],
    },
    items.filter((i) => i.verified)
  );
  assert.deepEqual(r.fields, ["데이터·분석"]);
  assert.deepEqual(r.values, ["나를 표현하기"]);
  assert.deepEqual(r.reasons, [{ id: "data1", reason: "숫자 얘기를 했어" }]);
});

test("AI 출력이 이상한 모양이어도 던지지 않는다", () => {
  for (const bad of [null, undefined, "x", 3, { fields: "a", reasons: "b" }]) {
    const r = sanitize(bad, items);
    assert.deepEqual(r, { fields: [], values: [], reasons: [] });
  }
});

test("이유는 160자로 자른다", () => {
  const r = sanitize({ reasons: [{ id: "data1", reason: "가".repeat(300) }] }, items);
  assert.equal(r.reasons[0].reason.length, 160);
});

test("기본 읽기: 말에서 분야와 가치를 찾는다", () => {
  const r = readBasic("데이터 분석이 궁금하고 친구를 돕는 게 좋아");
  assert.ok(r.fields.includes("데이터·분석"));
  assert.ok(r.fields.includes("사람·상담"));
  assert.ok(r.values.includes("누군가를 돕는 일"));
  assert.ok(r.values.includes("깊이 파고드는 탐구"));
});

test("넓히기는 말한 분야와 겹치지 않는 도전을 고른다", () => {
  const w = pickWiden(items, ["데이터·분석"], [], free, TODAY)!;
  assert.ok(!w.fields.includes("데이터·분석"));
  assert.notEqual(w.id, "hidden");
});

test("넓히기는 예산을 넘는 것을 고르지 않는다", () => {
  const w = pickWiden(items, ["데이터·분석", "글·콘텐츠"], [], free, TODAY);
  assert.equal(w, undefined);
});

test("넓히기는 가치관이 닿는 쪽을 먼저 고른다", () => {
  const list = [ch("a", ["글·콘텐츠"]), ch("b", ["사람·상담"], { values: ["누군가를 돕는 일"] })];
  const w = pickWiden(list, ["데이터·분석"], ["누군가를 돕는 일"], free, TODAY)!;
  assert.equal(w.id, "b");
});

test("build: 이유는 목록 안의 항목에만 붙고 상위 3개까지만 나온다", () => {
  const many = Array.from({ length: 6 }, (_, i) => ch(`d${i}`, ["데이터·분석"]));
  const reading: Reading = {
    fields: ["데이터·분석"],
    values: [],
    reasons: [{ id: "d1", reason: "이유" }],
  };
  const s = build(many, reading, free, TODAY, "ai");
  assert.equal(s.within.length, 3);
  assert.equal(s.mode, "ai");
  const withReason = s.within.find((p) => p.id === "d1");
  if (withReason) assert.equal(withReason.reason, "이유");
});

test("build: AI가 이유를 쓴 항목이 먼저 나오고 나머지는 기존 순서를 지킨다", () => {
  const list = [
    ch("a", ["데이터·분석"]),
    ch("b", ["데이터·분석"]),
    ch("c", ["데이터·분석"]),
    ch("d", ["데이터·분석"]),
  ];
  const reading: Reading = {
    fields: ["데이터·분석"],
    values: [],
    reasons: [{ id: "c", reason: "이유" }],
  };
  const s = build(list, reading, free, TODAY, "ai");
  assert.equal(s.within[0].id, "c");
  assert.deepEqual(s.within.slice(1).map((p) => p.id), ["a", "b"]);
});

test("build: 읽어낸 게 없으면 추천도 없다", () => {
  const s = build(items, { fields: [], values: [], reasons: [] }, free, TODAY, "basic");
  assert.equal(s.within.length, 0);
  assert.equal(s.withSupport.length, 0);
});
