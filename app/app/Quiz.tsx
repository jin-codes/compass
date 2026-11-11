"use client";

import { useState } from "react";
import { setAnswers, useAnswers } from "@/lib/answers";
import { ALL_QUESTIONS, ROUNDS, nextRound, profile, questionById } from "@/lib/questions";
import type { Seen } from "@/lib/questions";
import styles from "./page.module.css";

type View = { at: "intro" } | { at: "ask"; round: number; i: number } | { at: "result" };

const TOTAL = ALL_QUESTIONS.length;

/**
 * 나 알아가기. 한 번에 한 질문, 8개씩 묶음. 모든 질문은 건너뛸 수 있고 언제든 멈출 수 있다.
 * 결과는 유형·점수·순위가 아니라 "이렇게 답해서 이렇게 보였다"는 근거와 함께 보여준다.
 */
export function Quiz({ onSee }: { onSee: () => void }) {
  const picks = useAnswers();
  const answered = profile(picks).answered;
  const [view, setView] = useState<View>(answered > 0 ? { at: "result" } : { at: "intro" });

  const start = (round: number) => {
    // 이어서 할 때는 그 묶음에서 아직 안 답한 첫 질문부터 연다.
    const ids = ROUNDS[round].ids;
    const i = Math.max(0, ids.findIndex((id) => (picks[id] ?? []).length === 0));
    setView({ at: "ask", round, i });
  };

  if (view.at === "intro") {
    return (
      <section className={styles.quizPage}>
        <header className={styles.hero}>
          <h1>나 알아가기</h1>
          <p className={styles.lead}>
            해본 일, 하는 방식, 끌리는 것, 중요하게 여기는 것을 골라서 답하는 질문이야. 유형이나 점수는
            안 나오고, 네가 고른 답에서 어떤 쪽이 보이는지를 근거와 함께 보여줘.
          </p>
        </header>
        <ul className={styles.quizFacts}>
          <li>한 묶음은 8개, 2분쯤 걸려. 한 묶음만 해도 돼.</li>
          <li>더 하고 싶으면 묶음을 이어서 하면 돼. 전부 하면 {TOTAL}개야.</li>
          <li>모르겠거나 안 맞는 질문은 건너뛰어도 돼. 정답은 없어.</li>
          <li>답은 이 브라우저에만 저장돼. 해볼 거리를 찾을 때는 고른 답에서 보인 분야·가치 이름만 함께 써.</li>
        </ul>
        <button type="button" className={styles.go} onClick={() => start(0)}>
          가볍게 시작하기
        </button>
      </section>
    );
  }

  if (view.at === "ask") {
    const round = ROUNDS[view.round];
    const question = questionById(round.ids[view.i])!;
    const chosen = picks[question.id] ?? [];
    const last = view.i === round.ids.length - 1;
    const toggle = (label: string) => {
      const next = chosen.includes(label)
        ? chosen.filter((x) => x !== label)
        : chosen.length >= question.max
          ? chosen
          : [...chosen, label];
      const all = { ...picks, [question.id]: next };
      if (!next.length) delete all[question.id];
      setAnswers(all);
    };
    // 묶음 끝에서, 다음 묶음에 이미 답한 게 있으면(답 고치는 중) 그 묶음으로 이어 간다.
    const after = ROUNDS[view.round + 1];
    const hasLater = !!after && after.ids.some((id) => (picks[id] ?? []).length > 0);
    const forward = () =>
      !last
        ? setView({ at: "ask", round: view.round, i: view.i + 1 })
        : hasLater
          ? setView({ at: "ask", round: view.round + 1, i: 0 })
          : setView({ at: "result" });

    return (
      <section className={styles.quizPage} aria-label="질문">
        <div className={styles.quizHead}>
          <span className={styles.meta}>
            {view.round + 1}번째 묶음 · {round.title} · {view.i + 1}/{round.ids.length}
          </span>
          <button type="button" className={styles.link} onClick={() => setView({ at: "result" })}>
            여기까지만
          </button>
        </div>
        <div className={styles.quizBar} aria-hidden="true">
          <span style={{ width: `${((view.i + 1) / round.ids.length) * 100}%` }} />
        </div>
        <h2 className={styles.quizQ}>{question.q}</h2>
        <p className={styles.meta}>
          {question.max > 1 ? `${question.max}개까지 골라도 돼. ` : ""}해본 적이 없으면 건너뛰어.
        </p>
        <div className={styles.quizOptions}>
          {question.options.map((o) => {
            const on = chosen.includes(o.label);
            const full = !on && chosen.length >= question.max;
            return (
              <button
                key={o.label}
                type="button"
                aria-pressed={on}
                disabled={full}
                className={on ? styles.on : ""}
                onClick={() => toggle(o.label)}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        <div className={styles.quizNav}>
          <button
            type="button"
            className={styles.link}
            disabled={view.i === 0}
            onClick={() => setView({ at: "ask", round: view.round, i: view.i - 1 })}
          >
            이전
          </button>
          <button type="button" className={styles.quizNext} onClick={forward}>
            {chosen.length ? (last && !hasLater ? "이 묶음 끝" : "다음") : "건너뛰기"}
          </button>
        </div>
      </section>
    );
  }

  const p = profile(picks);
  const more = nextRound(picks);
  const empty = p.fields.length + p.values.length === 0;
  return (
    <section className={styles.quizPage} aria-label="지금까지 보인 나">
      <header className={styles.hero}>
        <h1>지금까지 보인 나</h1>
        <p className={styles.lead}>
          {TOTAL}개 중 {p.answered}개에 답했어. 고른 답만으로 본 거라 정답이 아니야. 해보면서 달라져도 돼.
        </p>
      </header>

      {empty ? (
        <p className={styles.empty}>아직 답한 게 없어서 보이는 게 없어. 한 묶음만 해봐.</p>
      ) : (
        <>
          <SeenList title="끌리는 쪽" items={p.fields} />
          <SeenList title="중요하게 여기는 것" items={p.values} />
          {p.answered < 5 && (
            <p className={styles.meta}>답이 적어서 아직 흐릿해. 몇 개만 더 답하면 더 또렷해져.</p>
          )}
          <button type="button" className={styles.go} onClick={onSee}>
            이걸로 해볼 거리 보기
          </button>
        </>
      )}

      <div className={styles.quizMore}>
        {more !== -1 ? (
          <button type="button" className={styles.qOpen} onClick={() => start(more)}>
            {p.answered === 0 ? "가볍게 시작하기" : `한 묶음 더 하기 (${ROUNDS[more].title}, 8개)`}
            <span>안 해도 돼</span>
          </button>
        ) : (
          <p className={styles.meta}>모든 질문에 답했어. 답은 언제든 고칠 수 있어.</p>
        )}
        <div className={styles.quizLinks}>
          {p.answered > 0 && (
            <button type="button" className={styles.link} onClick={() => setView({ at: "ask", round: 0, i: 0 })}>
              답 고치기
            </button>
          )}
          {p.answered > 0 && (
            <button
              type="button"
              className={styles.link}
              onClick={() => {
                if (confirm("고른 답을 모두 지울까? 되돌릴 수 없어.")) {
                  setAnswers({});
                  setView({ at: "intro" });
                }
              }}
            >
              답 모두 지우기
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function SeenList({ title, items }: { title: string; items: Seen[] }) {
  if (!items.length) return null;
  return (
    <div className={styles.seen}>
      <h2>{title}</h2>
      {items.map((s) => (
        <div key={s.tag} className={styles.seenItem}>
          <b>{s.tag}</b>
          <span className={styles.meta}>이렇게 답해서: {s.because.map((b) => `“${b}”`).join(", ")}</span>
        </div>
      ))}
    </div>
  );
}
