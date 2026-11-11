"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ITEMS } from "@/lib/items";
import { refreshAccount, useEntries } from "@/lib/log";
import { localToday } from "@/lib/date";
import { FIELD_OPTIONS } from "@/lib/items";
import { isPublishable } from "@/lib/recommend";
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

const noop = () => () => {};

/** 읽어낸 분야 순서대로 묶는다. 분야가 안 겹치고 가치관으로만 닿은 것은 마지막에 모은다. */
function groupByField(picks: Pick[], fields: string[]): [string, Pick[]][] {
  const groups = new Map<string, Pick[]>();
  for (const p of picks) {
    const item = itemById(p.id);
    if (!item) continue;
    const key = item.fields.find((f) => fields.includes(f)) ?? "가치관으로 닿은 것";
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const order = [...fields, "가치관으로 닿은 것"];
  return [...groups.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
}

/**
 * 글을 쓰지 않아도 확인된 목록 전체를 분야별로 둘러본다. AI를 부르지 않는다.
 * 순서는 목록 순서 그대로다. 서열이나 인기순을 만들지 않는다.
 */
function Browse({ onOpenLog, open }: { onOpenLog: () => void; open?: boolean }) {
  // 마감 판단은 학생 기기의 오늘 날짜로 한다. 미리 렌더할 때 날짜가 굳지 않게 마운트 뒤에 읽는다.
  const today = useSyncExternalStore(noop, localToday, () => null);
  if (!today) return null;
  const published = ITEMS.filter((i) => isPublishable(i, today) && i.kind !== "support");
  const supports = ITEMS.filter((i) => isPublishable(i, today) && i.kind === "support");
  const groups = FIELD_OPTIONS.map(
    (f) => [f, published.filter((i) => i.fields[0] === f)] as const
  ).filter(([, xs]) => xs.length > 0);
  return (
    <section className={styles.browse} aria-label="전체 둘러보기">
      <h2>
        전체 둘러보기 <span className={styles.meta}>{published.length}개</span>
      </h2>
      <p className={styles.meta}>
        안 써도 돼. 확인된 목록을 분야별로 다 열어뒀어. 끌리는 것부터 눌러봐.
      </p>
      {groups.map(([f, xs], i) => (
        <details key={f} className={styles.group} open={open && i === 0}>
          <summary>
            <b>{f}</b> <span className={styles.meta}>{xs.length}</span>
          </summary>
          <div className={styles.results}>
            {xs.map((x) => (
              <Card key={x.id} pick={{ id: x.id }} onOpenLog={onOpenLog} />
            ))}
          </div>
        </details>
      ))}
      {supports.length > 0 && (
        <details className={styles.group}>
          <summary>
            <b>지원 안내</b> <span className={styles.meta}>{supports.length}</span>
          </summary>
          <div className={styles.results}>
            {supports.map((x) => (
              <Card key={x.id} pick={{ id: x.id }} onOpenLog={onOpenLog} />
            ))}
          </div>
        </details>
      )}
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

      {groupByField(rest, s.fields).map(([label, picks]) => (
        <div key={label} className={styles.results}>
          <h2>
            {label} <span className={styles.meta}>{picks.length}</span>
          </h2>
          {picks.map((p) => (
            <Card key={p.id} pick={p} onOpenLog={onOpenLog} />
          ))}
        </div>
      ))}

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

  useEffect(() => {
    if (result || loading) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result, loading]);

  const ready = text.trim().length >= 2 && !loading;
  const budgetLabel = BUDGETS.find((b) => b.value === budget)?.label;
  const equipmentLabel = EQUIPMENTS.find((e) => e.value === equipment)?.label;

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
              해본 것, 궁금한 것, 시간 가는 줄 몰랐던 순간을 한두 문장 써줘. 직업을 정해주지 않고,
              맞는 해볼 거리를 전부 펼쳐줄게. 안 써도 목록을 그냥 둘러봐도 돼.
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
                result && (
                  <>
                    <Results s={result} onOpenLog={() => setTab("log")} hasText={resultHadText} />
                    <Browse onOpenLog={() => setTab("log")} />
                  </>
                )
              )}
            </div>
          ) : (
            <Browse onOpenLog={() => setTab("log")} open />
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
