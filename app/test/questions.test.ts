import { test } from "node:test";
import assert from "node:assert/strict";
import { FIELD_OPTIONS, VALUE_OPTIONS } from "../lib/items.ts";
import { ALL_QUESTIONS, answeredCount, cleanHints, tally } from "../lib/questions.ts";

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
