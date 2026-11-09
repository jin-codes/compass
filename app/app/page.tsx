"use client";

import { useEffect, useRef, useState } from "react";
import { ITEMS } from "@/lib/items";
import { refreshAccount, useEntries } from "@/lib/log";
import { SECTIONS, answeredCount, tally } from "@/lib/questions";
import type { Picks } from "@/lib/questions";
import type { Pick, Suggestion } from "@/lib/suggest";
import type { Budget, Equipment, Item } from "@/lib/types";
import { LogSection, RecordButton } from "./Log";
import styles from "./page.module.css";

const BUDGETS: { value: Budget; label: string }[] = [
  { value: 0, label: "무료만" },
  { value: 30000, label: "3만원 이하" },
  { value: 100000, label: "10만원 이하" },
  { value: -1, label: "제한 없음" },
];
const HOURS = [1, 2, 4, 6];
const EQUIPMENTS: { value: Equipment; label: string }[] = [
  { value: "phone", label: "스마트폰만" },
  { value: "laptop", label: "노트북이나 PC" },
  { value: "special", label: "별도 장비도 가능" },
];
const EXAMPLES = [
  "데이터로 뭔가 알아내는 게 재밌어",
  "친구 고민 들어주는 편이야",
  "직접 만들어서 올려보고 싶어",
  "그림이나 사진 찍는 걸 좋아해",
];

const itemById = (id: string): Item | undefined => ITEMS.find((i) => i.id === id);

function costLabel(item: Item) {
  return item.costKrw === 0 ? "무료" : `약 ${item.costKrw.toLocaleString("ko-KR")}원`;
}

function Card({
  pick,
  hero,
  onOpenLog,
}: {
  pick: Pick;
  hero?: boolean;
  onOpenLog: () => void;
}) {
  const item = itemById(pick.id);
  if (!item) return null;
  const cheaper = item.cheaperAltId ? itemById(item.cheaperAltId) : undefined;
  return (
    <article className={`${styles.card} ${hero ? styles.cardHero : ""}`}>
      <div className={styles.cardHead}>
        <h3>{item.name}</h3>
        {item.sample && <span className={styles.badge}>샘플</span>}
      </div>
      {pick.reason && <p className={styles.reason}>{pick.reason}</p>}
      <p>{item.summary}</p>
      <p className={styles.learns}>
        <b>배울 수 있는 것</b> {item.learns}
      </p>
      <p className={styles.meta}>
        {costLabel(item)} · 주 {item.hoursPerWeek}시간쯤
        {item.equipment === "laptop" ? " · 노트북이나 PC 필요" : ""}
        {item.equipment === "special" ? " · 별도 장비 필요" : ""}
        {item.costNote ? ` · ${item.costNote}` : ""}
        {item.eligibility ? ` · ${item.eligibility}` : ""}
      </p>
      {cheaper && (
        <p className={styles.alt}>
          같은 걸 배울 수 있는 다른 길: <b>{cheaper.name}</b> ({costLabel(cheaper)})
        </p>
      )}
      {item.kind === "challenge" && (
        <RecordButton itemId={item.id} title={item.name} onOpenLog={onOpenLog} />
      )}
      {item.sourceUrl && (
        <p className={styles.meta}>
          <a href={item.sourceUrl} target="_blank" rel="noreferrer">
            출처
          </a>
          {item.lastChecked ? ` · 마지막 확인 ${item.lastChecked}` : ""}
        </p>
      )}
    </article>
  );
}

const LOADING_STEPS = [
  "네가 쓴 글을 읽는 중이야",
  "해볼 만한 것을 목록에서 찾는 중이야",
  "왜 어울리는지 적는 중이야",
  "거의 다 됐어",
];

/** 응답을 기다리는 동안 보여주는 자리. 단계 문구는 처리 순서를 말할 뿐 실제 진행률이 아니다. */
function Loading({ text }: { text: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <section className={styles.results} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.read}>
        {text && (
          <>
            <span className={styles.meta}>네가 쓴 말</span>
            <span className={styles.echo}>{text}</span>
          </>
        )}
        <span>{LOADING_STEPS[step]}…</span>
      </div>
      <div className={styles.skeleton} aria-hidden="true">
        <span style={{ width: "62%" }} />
        <span style={{ width: "100%" }} />
        <span style={{ width: "88%" }} />
        <span style={{ width: "40%" }} />
      </div>
    </section>
  );
}

function Results({ s, onOpenLog, hasText }: { s: Suggestion; onOpenLog: () => void; hasText: boolean }) {
  const [first, ...rest] = s.within;
  const read = [...s.fields, ...s.values];
  const nothing = !first && s.withSupport.length === 0;
  return (
    <section className={styles.results} aria-live="polite">
      <div className={styles.read}>
        {read.length > 0 ? (
          <>
            <span>
              {hasText
                ? "이렇게 읽었어. 아니면 위 글을 고쳐서 다시 찾아봐."
                : "고른 답으로 읽었어. 글도 한두 문장 써주면 더 잘 맞출 수 있어."}
            </span>
            <div className={styles.tags}>
              {read.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </>
        ) : (
          <span>
            아직 끌리는 쪽을 못 읽었어. 무엇을 해봤는지, 어떤 때 시간 가는 줄 몰랐는지
            한두 문장만 더 써줘.
          </span>
        )}
        {s.mode === "basic" && hasText && (
          <span className={styles.meta}>
            {s.busy
              ? "지금 AI를 쓰는 사람이 많아서 이번에는 단어로만 읽었어. 조금 있다 다시 해보면 더 잘 읽어."
              : "지금은 AI 없이 단어로만 읽었어. 정확하지 않을 수 있어."}
          </span>
        )}
      </div>

      {nothing && read.length > 0 && (
        <p className={styles.empty}>
          이 조건에 맞는 시도가 아직 목록에 없어. 말이나 조건을 바꿔서 다시 찾아봐.
        </p>
      )}

      {first && (
        <>
          <h2>이번 주 하나</h2>
          <Card pick={first} hero onOpenLog={onOpenLog} />
        </>
      )}

      {rest.length > 0 && (
        <>
          <h2>다른 선택지</h2>
          {rest.map((p) => (
            <Card key={p.id} pick={p} onOpenLog={onOpenLog} />
          ))}
        </>
      )}

      {s.widen && read.length > 0 && (
        <>
          <h2>전혀 다른 쪽도 하나</h2>
          <p className={styles.meta}>
            방금 말한 것과 겹치지 않는 쪽이야. 끌리는지 확인하는 데 써. 정답이 아니야.
          </p>
          <Card pick={s.widen} onOpenLog={onOpenLog} />
        </>
      )}

      {s.withSupport.length > 0 && (
        <>
          <h2>조건을 조금 넘지만 함께 볼 만한 것</h2>
          <p className={styles.meta}>
            예산이나 장비가 지금 조건을 넘어. 더 가벼운 길이 있으면 함께 적어뒀어.
            {s.supports.length > 0 ? " 비용이 걸리면 아래 지원 안내를 봐." : ""}
          </p>
          {s.withSupport.map((p) => (
            <Card key={p.id} pick={p} onOpenLog={onOpenLog} />
          ))}
        </>
      )}

      {s.supports.length > 0 && (
        <>
          <h2>지원 안내</h2>
          {s.supports.map((id) => {
            const x = itemById(id);
            if (!x) return null;
            return (
              <article key={x.id} className={styles.card}>
                <h3>{x.name}</h3>
                <p>{x.summary}</p>
                {x.eligibility && <p className={styles.meta}>{x.eligibility}</p>}
                {x.sourceUrl && (
                  <p className={styles.meta}>
                    <a href={x.sourceUrl} target="_blank" rel="noreferrer">
                      출처
                    </a>
                    {x.lastChecked ? ` · 마지막 확인 ${x.lastChecked}` : ""}
                  </p>
                )}
              </article>
            );
          })}
        </>
      )}
    </section>
  );
}

export default function Home() {
  useEffect(() => {
    void refreshAccount();
  }, []);
  const entries = useEntries();
  const [tab, setTab] = useState<"find" | "log">("find");
  const [text, setText] = useState("");
  const [budget, setBudget] = useState<Budget>(0);
  const [hours, setHours] = useState(2);
  const [equipment, setEquipment] = useState<Equipment>("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Suggestion | null>(null);
  const [resultHadText, setResultHadText] = useState(true);
  const resultsRef = useRef<HTMLDivElement>(null);
  // 표준 질문지. AI를 부르지 않고, 모두 건너뛸 수 있다.
  const [qOpen, setQOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<Picks>({});

  useEffect(() => {
    if (result || loading) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result, loading]);

  const ready = (text.trim().length >= 2 || answeredCount(picks) > 0) && !loading;
  const budgetLabel = BUDGETS.find((b) => b.value === budget)?.label;
  const equipmentLabel = EQUIPMENTS.find((e) => e.value === equipment)?.label;

  function togglePick(qid: string, label: string, max: number) {
    setPicks((p) => {
      const cur = p[qid] ?? [];
      if (cur.includes(label)) return { ...p, [qid]: cur.filter((x) => x !== label) };
      return { ...p, [qid]: cur.length >= max ? cur : [...cur, label] };
    });
  }

  async function find() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          budget,
          hours,
          equipment,
          hints: tally(picks),
        }),
      });
      if (res.status === 429) {
        setError("잠깐 너무 많이 눌렀어. 1분쯤 뒤에 다시 해봐.");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setResult((await res.json()) as Suggestion);
      setResultHadText(text.trim().length >= 2);
    } catch {
      setError("지금은 못 찾았어. 잠시 뒤에 다시 눌러봐.");
    } finally {
      setLoading(false);
    }
  }

  const chips = <T extends string | number>(
    options: { value: T; label: string }[],
    current: T,
    set: (v: T) => void
  ) => (
    <div className={styles.chips}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={current === o.value}
          className={current === o.value ? styles.on : ""}
          onClick={() => set(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <main className={styles.main}>
      <div className={styles.bar}>
        <span className={styles.brand}>Compass Rose</span>
        <nav className={styles.tabs} aria-label="화면">
          <button type="button" aria-pressed={tab === "find"} onClick={() => setTab("find")}>
            찾기
          </button>
          <button type="button" aria-pressed={tab === "log"} onClick={() => setTab("log")}>
            내 기록{entries.length > 0 ? ` ${entries.length}` : ""}
          </button>
        </nav>
      </div>

      {tab === "find" && (
        <div className={styles.find}>
          <div className={styles.findInput}>
          <header className={styles.hero}>
            <h1>요즘 뭐가 끌려?</h1>
            <p className={styles.lead}>
              해본 것, 궁금한 것, 시간 가는 줄 몰랐던 순간을 편하게 써줘. 직업을 정해주지 않고,
              이번 주에 해볼 거리를 보여줄게.
            </p>
          </header>

          <div className={styles.ask}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              placeholder="예: 학교 동아리에서 데이터를 정리했는데 생각보다 재밌었어. 근데 이게 진로랑 이어지는지는 모르겠어."
              aria-label="요즘 끌리는 것"
            />
            <div className={styles.examples}>
              {EXAMPLES.map((ex) => (
                <button key={ex} type="button" onClick={() => setText(ex)}>
                  {ex}
                </button>
              ))}
            </div>

            {!qOpen ? (
              <button
                type="button"
                className={styles.qOpen}
                onClick={() => setQOpen(true)}
              >
                질문에 답하고 더 좁히기 <span>건너뛰어도 돼</span>
              </button>
            ) : (
              <section className={styles.quiz} aria-label="질문지">
                <div className={styles.quizHead}>
                  <b>
                    {SECTIONS[step].title}{" "}
                    <span className={styles.meta}>
                      {step + 1}/{SECTIONS.length}
                    </span>
                  </b>
                  <button type="button" className={styles.link} onClick={() => setQOpen(false)}>
                    접기
                  </button>
                </div>
                <p className={styles.meta}>
                  정답은 없어. 점수도 유형도 안 나와. 답한 것만 추천을 좁히는 데 써.
                  {answeredCount(picks) > 0 ? ` (${answeredCount(picks)}개 답함)` : ""}
                </p>
                {SECTIONS[step].questions.map((qu) => (
                  <div key={qu.id} className={styles.qBlock}>
                    <b>
                      {qu.q}{" "}
                      <span className={styles.meta}>(최대 {Math.min(qu.max, qu.options.length)}개)</span>
                    </b>
                    <div className={styles.chips}>
                      {qu.options.map((o) => {
                        const on = (picks[qu.id] ?? []).includes(o.label);
                        return (
                          <button
                            key={o.label}
                            type="button"
                            aria-pressed={on}
                            className={on ? styles.on : ""}
                            onClick={() => togglePick(qu.id, o.label, qu.max)}
                          >
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className={styles.quizNav}>
                  <button
                    type="button"
                    className={styles.link}
                    disabled={step === 0}
                    onClick={() => setStep(step - 1)}
                  >
                    이전
                  </button>
                  <button
                    type="button"
                    className={styles.link}
                    disabled={step === SECTIONS.length - 1}
                    onClick={() => setStep(step + 1)}
                  >
                    다음
                  </button>
                </div>
              </section>
            )}

            <details className={styles.conditions}>
              <summary>
                <span>
                  <b>{budgetLabel}</b> · 주 <b>{hours}시간</b> · <b>{equipmentLabel}</b>
                </span>
                <span>바꾸기</span>
              </summary>
              <div className={styles.conditionBody}>
                <div className={styles.row}>
                  <span>예산</span>
                  {chips(BUDGETS, budget, setBudget)}
                </div>
                <div className={styles.row}>
                  <span>일주일에 쓸 수 있는 시간</span>
                  {chips(
                    HOURS.map((h) => ({ value: h, label: `${h}시간` })),
                    hours,
                    setHours
                  )}
                </div>
                <div className={styles.row}>
                  <span>쓸 수 있는 장비</span>
                  {chips(EQUIPMENTS, equipment, setEquipment)}
                </div>
              </div>
            </details>

            <button type="button" className={styles.go} disabled={!ready} onClick={find}>
              {loading ? "찾는 중…" : "해볼 거리 찾기"}
            </button>
            {error && <p className={styles.error}>{error}</p>}
            <p className={styles.privacy}>
              쓴 글은 추천을 만들기 위해 AI(Anthropic의 Claude)에게 전달돼. 우리 서버에는 저장하지
              않지만, AI 회사 쪽에는 보통 30일쯤 남을 수 있어. 이름·학교·연락처처럼 나를 알아볼
              수 있는 내용은 쓰지 마. 기록은 네가 저장을 켜기 전에는 이 브라우저에만 남아.
            </p>
          </div>
          </div>

          {loading || result ? (
            <div ref={resultsRef} className={styles.results}>
              {loading ? (
                <Loading text={text.trim()} />
              ) : (
                result && <Results s={result} onOpenLog={() => setTab("log")} hasText={resultHadText} />
              )}
            </div>
          ) : (
            <div className={styles.placeholder} aria-hidden="true">
              쓰고 나면 해볼 거리가 여기에 나와.
            </div>
          )}
        </div>
      )}

      {tab === "log" && (
        <div className={styles.logPage}>
          <LogSection interestedFields={result?.fields ?? []} />
        </div>
      )}

      <footer className={styles.foot}>
        추천은 확인된 목록 안에서만 해. 정보는 마지막 확인일 기준이야.
      </footer>
    </main>
  );
}
