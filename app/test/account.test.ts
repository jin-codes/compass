import { test } from "node:test";
import assert from "node:assert/strict";
import { hashCode, newCode, normalizeCode, signUp, userFromCode } from "../lib/account.ts";
import { checkEntries, checkEntry } from "../lib/entry-check.ts";
import { memoryStore } from "../lib/store.ts";

test("복구 코드: 4자씩 4덩어리, 서로 다르게 나온다", () => {
  const a = newCode();
  assert.match(a, /^[0-9A-Z]{4}(-[0-9A-Z]{4}){3}$/);
  assert.notEqual(a, newCode());
  assert.equal(normalizeCode(a), a);
});

test("코드는 소문자·띄어쓰기·하이픈 없이 적어도, 헷갈리는 글자도 같게 읽는다", () => {
  const code = "0123-4567-89AB-CDEF";
  assert.equal(normalizeCode("0123 4567 89ab cdef"), code);
  assert.equal(normalizeCode("oi23456789abcdef"), "0123-4567-89AB-CDEF");
  assert.equal(normalizeCode("짧음"), null);
  assert.equal(normalizeCode("0123-4567-89AB-CDE"), null);
});

test("서버에는 코드가 아니라 해시만 남고, 같은 코드로 같은 계정을 찾는다", async () => {
  const s = memoryStore();
  const code = await signUp(s);
  const id = await userFromCode(s, code);
  assert.ok(id);
  assert.equal(await userFromCode(s, code.toLowerCase().replace(/-/g, " ")), id);
  assert.equal(await userFromCode(s, newCode()), null);
  assert.equal(await userFromCode(s, undefined), null);
  assert.notEqual(hashCode(code), code);
});

test("계정을 지우면 기록도 같이 사라지고 같은 코드로 못 찾는다", async () => {
  const s = memoryStore();
  const code = await signUp(s);
  const id = (await userFromCode(s, code))!;
  await s.upsertEntries(id, [{ id: "a", date: "2026-11-08", title: "t", note: "n" }]);
  await s.deleteUser(id);
  assert.equal(await userFromCode(s, code), null);
  assert.deepEqual(await s.listEntries(id), []);
});

test("다른 계정의 기록은 건드리지 못한다", async () => {
  const s = memoryStore();
  const u1 = await s.createUser("h1");
  const u2 = await s.createUser("h2");
  await s.upsertEntries(u1, [{ id: "a", date: "2026-11-08", title: "t", note: "n" }]);
  await s.deleteEntry(u2, "a");
  assert.equal((await s.listEntries(u1)).length, 1);
  assert.equal((await s.listEntries(u2)).length, 0);
});

test("기록 검사: 모양이 틀리면 버리고, 길이와 경향 코드를 제한한다", () => {
  assert.equal(checkEntry(null), null);
  assert.equal(checkEntry({ id: "a b", date: "2026-11-08", title: "t", note: "" }), null);
  assert.equal(checkEntry({ id: "a", date: "내일", title: "t", note: "" }), null);
  assert.equal(checkEntry({ id: "a", date: "2026-11-08", title: "  ", note: "" }), null);
  const e = checkEntry({
    id: "a",
    date: "2026-11-08",
    title: "t".repeat(200),
    note: "n".repeat(900),
    depth: 9,
    dims: ["T", "Q", 3, "E"],
    field: "글·콘텐츠",
  })!;
  assert.equal(e.title.length, 80);
  assert.equal(e.note.length, 500);
  assert.equal(e.depth, undefined);
  assert.deepEqual(e.dims, ["T", "E"]);
  assert.equal(checkEntries("x"), null);
  assert.equal(checkEntries(new Array(501).fill({})), null);
  assert.equal(checkEntries([{ bad: 1 }])!.length, 0);
});
