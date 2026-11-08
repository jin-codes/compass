import { test } from "node:test";
import assert from "node:assert/strict";
import { basicReflect, sanitizeReflect } from "../lib/reflect.ts";
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
const items = [
  ch("a", ["데이터·분석"]),
  ch("pricey", ["데이터·분석"], { costKrw: 500000 }),
  ch("w", ["글·콘텐츠"], { costKrw: 5000 }),
];

test("AI가 목록에 없는 id를 내면 다음 시도를 버리고 반응만 남긴다", () => {
  const r = sanitizeReflect({ noticed: "좋아", fields: [], next: { id: "fake", reason: "x" } }, items, []);
  assert.equal(r?.noticed, "좋아");
  assert.equal(r?.next, undefined);
});

test("이미 한 도전과 비싼 도전은 다음 시도로 쓰지 않는다", () => {
  const done = sanitizeReflect({ noticed: "n", fields: [], next: { id: "a", reason: "" } }, items, ["a"]);
  assert.equal(done?.next, undefined);
  const pricey = sanitizeReflect({ noticed: "n", fields: [], next: { id: "pricey", reason: "" } }, items, []);
  assert.equal(pricey?.next, undefined);
});

test("반응 문장이 비면 null이라 기본 반응으로 넘어간다", () => {
  assert.equal(sanitizeReflect({ noticed: " ", fields: [], next: { id: "", reason: "" } }, items, []), null);
});

test("기본 반응은 적은 말의 분야에서 싼 도전을 붙인다", () => {
  const r = basicReflect("데이터 그래프 만들기", "", items, []);
  assert.equal(r.mode, "basic");
  assert.equal(r.next?.id, "a");
});

test("기본 반응은 분야를 못 읽으면 다음 시도 없이 반응만 준다", () => {
  const r = basicReflect("산책", "", items, []);
  assert.equal(r.next, undefined);
  assert.ok(r.noticed);
});

test("질문은 길이를 제한해 남기고, 없으면 붙이지 않는다", () => {
  const q = sanitizeReflect({ noticed: "n", question: "어느 순간이 달랐어?", fields: [], next: { id: "", reason: "" } }, items, []);
  assert.equal(q?.question, "어느 순간이 달랐어?");
  const none = sanitizeReflect({ noticed: "n", question: " ", fields: [], next: { id: "", reason: "" } }, items, []);
  assert.equal(none?.question, undefined);
});

test("기본 반응에도 질문이 붙는다", () => {
  assert.ok(basicReflect("산책", "", items, []).question);
});
