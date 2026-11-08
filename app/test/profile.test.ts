import { test } from "node:test";
import assert from "node:assert/strict";
import { profile } from "../lib/profile.ts";
import { advise } from "../lib/advice.ts";
import type { Entry } from "../lib/log.ts";
import type { Item } from "../lib/types.ts";

const e = (field: string, depth: 1 | 2 | 3, dims: string[], date = "2026-11-01"): Entry => ({
  id: Math.random().toString(),
  date,
  title: "t",
  note: "n",
  field,
  depth,
  dims,
});

test("예시로 분야가 붙은 기록이 없으면 null", () => {
  assert.equal(profile([]), null);
  assert.equal(profile([{ id: "1", date: "2026-11-01", title: "t", note: "n" }]), null);
});

test("기록이 3개 미만이면 경향을 단정하지 않는다", () => {
  const p = profile([e("글·콘텐츠", 2, ["E"]), e("글·콘텐츠", 2, ["E"])])!;
  assert.deepEqual(p.leanings, []);
  assert.equal(p.style, null);
});

test("3개 이상이면 깊이 가중이 큰 경향부터 최대 3개", () => {
  const p = profile([
    e("글·콘텐츠", 3, ["E", "G"]),
    e("글·콘텐츠", 1, ["T"]),
    e("데이터·분석", 1, ["A"]),
  ])!;
  assert.deepEqual(p.leanings.slice(0, 2).sort(), ["E", "G"]);
  assert.ok(p.leanings.length <= 3);
});

test("분야 단계는 점수가 아니라 단계로만 나온다", () => {
  const p = profile([e("글·콘텐츠", 3, []), e("글·콘텐츠", 2, []), e("사람·상담", 1, [])])!;
  const stage = Object.fromEntries(p.fieldStages.map((f) => [f.field, f.stage]));
  assert.equal(stage["글·콘텐츠"], "deep");
  assert.equal(stage["사람·상담"], "taste");
  assert.equal(p.breadth, 2);
  assert.equal(p.outputCount, 1);
  assert.ok(p.fieldStages.every((f) => !("score" in f)));
});

test("함께한 일의 비율로 스타일을 말한다", () => {
  assert.equal(profile([e("a", 1, ["C"]), e("a", 1, ["C"]), e("b", 1, ["S"])])!.style, "together");
  assert.equal(profile([e("a", 1, ["S"]), e("a", 1, ["T"]), e("b", 1, ["S"])])!.style, "alone");
});

test("기간은 첫 기록과 마지막 기록 사이 일수", () => {
  const p = profile([e("a", 1, [], "2026-11-01"), e("a", 1, [], "2026-11-11")])!;
  assert.equal(p.spanDays, 10);
});

test("advise: 예시 기록만 있어도 분야를 읽고, 모르는 분야는 무시하지 않는다", () => {
  const item: Item = {
    id: "x", kind: "challenge", name: "x", summary: "", learns: "", fields: ["글·콘텐츠", "디자인·시각"],
    values: [], costKrw: 0, hoursPerWeek: 1, equipment: "phone", verified: true,
  };
  const r = advise([e("글·콘텐츠", 2, [])], [item], [], "2026-11-07")!;
  assert.deepEqual(r.topFields, ["글·콘텐츠"]);
  assert.equal(r.doneCount, 0);
  assert.deepEqual(r.blends.map((i) => i.id), ["x"]);
});
