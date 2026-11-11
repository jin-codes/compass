import { test } from "node:test";
import assert from "node:assert/strict";
import { FIELD_OPTIONS, VALUE_OPTIONS } from "../lib/items.ts";
import {
  ALL_QUESTIONS,
  ROUNDS,
  answeredCount,
  cleanHints,
  cleanPicks,
  nextRound,
  profile,
  tally,
} from "../lib/questions.ts";

test("질문은 30개 이상이고 id와 선택지 라벨이 겹치지 않는다", () => {
  assert.ok(ALL_QUESTIONS.length >= 30);
  assert.equal(new Set(ALL_QUESTIONS.map((x) => x.id)).size, ALL_QUESTIONS.length);
  for (const x of ALL_QUESTIONS) {
    assert.equal(new Set(x.options.map((o) => o.label)).size, x.options.length, x.id);
    assert.ok(x.max >= 1);
  }
});

test("모든 선택지는 태그가 있고 태그는 실제 선택지 안에 있다", () => {
  for (const x of ALL_QUESTIONS)
    for (const o of x.options) {
      assert.ok(o.values || o.fields, o.label);
      o.values?.forEach((t) => assert.ok(VALUE_OPTIONS.includes(t), t));
      o.fields?.forEach((t) => assert.ok(FIELD_OPTIONS.includes(t), t));
    }
});

test("tally: 많이 나온 태그가 앞에 오고 상위 3개까지만 남긴다", () => {
  const r = tally({
    asked: ["자료나 숫자를 정리해 주는 일"],
    search: ["순위·통계·비교 자료", "새 앱이나 만드는 법"],
    class: ["글쓰기나 발표 준비"],
    friends: ["고민 상담"],
  });
  assert.deepEqual(r.fields, ["데이터·분석", "소프트웨어·만들기", "글·콘텐츠"]);
  assert.deepEqual(tally({}), { fields: [], values: [] });
});

test("답한 질문 수 세기와 요청 선택 거르기", () => {
  assert.equal(answeredCount({ flow: ["혼자 끝까지 파고들었어"], stuck: [] }), 1);
  assert.deepEqual(
    cleanHints({ fields: ["데이터·분석", "의사"], values: ["돈 많이 벌기", "나를 표현하기"] }),
    { fields: ["데이터·분석"], values: ["나를 표현하기"] }
  );
});

test("묶음은 모든 질문을 한 번씩 담고, 묶음마다 분야와 가치 질문이 섞여 있다", () => {
  const ids = ROUNDS.flatMap((r) => r.ids);
  assert.equal(ids.length, ALL_QUESTIONS.length);
  assert.equal(new Set(ids).size, ids.length);
  for (const r of ROUNDS) {
    const qs = r.ids.map((id) => ALL_QUESTIONS.find((x) => x.id === id)!);
    assert.ok(qs.every(Boolean), r.title);
    assert.ok(qs.some((x) => x.options.some((o) => o.fields)), r.title);
    assert.ok(qs.some((x) => x.options.some((o) => o.values)), r.title);
  }
});

test("profile: 보인 태그마다 실제로 고른 답을 근거로 붙인다", () => {
  const p = profile({ eyes: ["숫자·통계·그래프"], proud: ["누군가에게 도움이 됐을 때"] });
  assert.equal(p.answered, 2);
  assert.deepEqual(p.fields, [{ tag: "데이터·분석", because: ["숫자·통계·그래프"] }]);
  assert.deepEqual(p.values, [{ tag: "누군가를 돕는 일", because: ["누군가에게 도움이 됐을 때"] }]);
});

test("nextRound: 아직 안 연 첫 묶음, 건너뛴 질문은 다시 들이밀지 않는다", () => {
  assert.equal(nextRound({}), 0);
  const first = Object.fromEntries(
    ROUNDS[0].ids.map((id) => [id, [ALL_QUESTIONS.find((x) => x.id === id)!.options[0].label]])
  );
  assert.equal(nextRound(first), 1);
  assert.equal(nextRound({ [ROUNDS[0].ids[0]]: first[ROUNDS[0].ids[0]] }), 1);
  const all = Object.fromEntries(ALL_QUESTIONS.map((x) => [x.id, [x.options[0].label]]));
  assert.equal(nextRound(all), -1);
});

test("cleanPicks: 없는 질문·선택지는 버리고 최대 개수를 지킨다", () => {
  assert.deepEqual(
    cleanPicks({ eyes: ["숫자·통계·그래프", "없는 답", "글, 영상, 콘텐츠", "그림, 사진, 디자인", "실험하고 관찰하는 것"], nope: ["x"], stuck: "x" }),
    { eyes: ["숫자·통계·그래프", "글, 영상, 콘텐츠", "그림, 사진, 디자인"] }
  );
  assert.deepEqual(cleanPicks(null), {});
});
