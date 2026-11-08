import { test } from "node:test";
import assert from "node:assert/strict";
import { createGuard } from "../lib/guard.ts";

const limits = { perIpPerMinute: 3, perIpAiPerDay: 4, aiPerHour: 5 };

function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

test("분당 한도를 넘으면 거절하고, 1분이 지나면 풀린다", () => {
  const c = clock();
  const check = createGuard(limits, c.now);
  assert.deepEqual([check("a"), check("a"), check("a")], ["ai", "ai", "ai"]);
  assert.equal(check("a"), "blocked");
  c.advance(61_000);
  assert.equal(check("a"), "ai");
});

test("IP는 서로 영향을 주지 않는다", () => {
  const check = createGuard(limits, clock().now);
  for (let i = 0; i < 5; i++) check("a");
  assert.equal(check("b"), "ai");
});

test("하루 AI 한도를 넘으면 거절하지 않고 키워드로 넘긴다", () => {
  const c = clock();
  const check = createGuard({ ...limits, perIpPerMinute: 100 }, c.now);
  for (let i = 0; i < 4; i++) assert.equal(check("a"), "ai");
  assert.equal(check("a"), "keyword");
  c.advance(25 * 60 * 60 * 1000);
  assert.equal(check("a"), "ai");
});

test("시간당 AI 예산을 넘으면 새 IP도 키워드로 넘어가고, 1시간 뒤 풀린다", () => {
  const c = clock();
  const check = createGuard({ ...limits, perIpPerMinute: 100 }, c.now);
  for (let i = 0; i < 5; i++) assert.equal(check(`ip${i}`), "ai");
  assert.equal(check("fresh"), "keyword");
  c.advance(61 * 60_000);
  assert.equal(check("fresh"), "ai");
});

test("키워드로 넘어간 요청은 AI 예산을 더 쓰지 않는다", () => {
  const c = clock();
  const check = createGuard({ ...limits, perIpPerMinute: 100, aiPerHour: 1 }, c.now);
  assert.equal(check("a"), "ai");
  for (let i = 0; i < 20; i++) assert.equal(check("b"), "keyword");
  c.advance(61 * 60_000);
  assert.equal(check("b"), "ai");
});

test("거절된 요청도 AI 예산을 쓰지 않는다", () => {
  const check = createGuard({ ...limits, perIpPerMinute: 1, aiPerHour: 2 }, clock().now);
  assert.equal(check("a"), "ai");
  for (let i = 0; i < 10; i++) assert.equal(check("a"), "blocked");
  assert.equal(check("b"), "ai");
  assert.equal(check("c"), "keyword");
});
