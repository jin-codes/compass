"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FIELD_OPTIONS, ITEMS, VALUE_OPTIONS } from "@/lib/items";
import { localToday } from "@/lib/date";
import { recommend } from "@/lib/recommend";
import type {
  Budget,
  Equipment,
  Item,
  Recommendation,
} from "@/lib/types";
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

function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function costLabel(item: Item) {
  if (item.costKrw === 0) return "무료";
  return `약 ${item.costKrw.toLocaleString("ko-KR")}원`;
}

function Card({ rec, support }: { rec: Recommendation; support?: boolean }) {
  const { item, matchedFields, matchedValues, cheaperAlt } = rec;
  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <h3>{item.name}</h3>
        {item.sample && <span className={styles.badge}>샘플</span>}
      </div>
      <p>{item.summary}</p>
      <p className={styles.learns}>
        <b>배울 수 있는 것</b> {item.learns}
      </p>
      <p className={styles.meta}>
        {costLabel(item)} · 주 {item.hoursPerWeek}시간쯤
        {item.costNote ? ` · ${item.costNote}` : ""}
      </p>
      {(matchedFields.length > 0 || matchedValues.length > 0) && (
        <p className={styles.why}>
          이어지는 지점: {[...matchedFields, ...matchedValues].join(", ")}
        </p>
      )}
      {support && cheaperAlt && (
        <p className={styles.alt}>
          같은 걸 배울 수 있는 다른 길: <b>{cheaperAlt.name}</b> (
          {costLabel(cheaperAlt)})
        </p>
      )}
      {item.kind === "challenge" && (
        <RecordButton itemId={item.id} title={item.name} />
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

export default function Home() {
  const [fields, setFields] = useState<string[]>([]);
  const [values, setValues] = useState<string[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [hours, setHours] = useState<number | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const resultsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (submitted) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [submitted]);

  const ready =
    fields.length + values.length > 0 &&
    budget !== null &&
    hours !== null &&
    equipment !== null;

  const result = useMemo(() => {
    if (!submitted || budget === null || hours === null || equipment === null) {
      return null;
    }
    const today = localToday();
    return recommend(
      ITEMS,
      { fields, values, constraints: { budget, hoursPerWeek: hours, equipment } },
      today
    );
  }, [submitted, fields, values, budget, hours, equipment]);

  const empty =
    result && result.within.length === 0 && result.withSupport.length === 0;

  return (
    <main className={styles.main}>
      <header>
        <h1>Compass Rose</h1>
        <p className={styles.lead}>
          직업 하나를 찍어주지 않아. 끌리는 것과 중요하게 여기는 것을 고르면,
          이번 주에 해볼 수 있는 시도를 보여줄게. 무엇을 할지는 네가 정해.
        </p>
      </header>

      <section className={styles.block}>
        <h2>끌리는 분야</h2>
        <div className={styles.chips}>
          {FIELD_OPTIONS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={fields.includes(f)}
              className={fields.includes(f) ? styles.on : ""}
              onClick={() => setFields(toggle(fields, f))}
            >
              {f}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.block}>
        <h2>일할 때 중요한 것</h2>
        <div className={styles.chips}>
          {VALUE_OPTIONS.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={values.includes(v)}
              className={values.includes(v) ? styles.on : ""}
              onClick={() => setValues(toggle(values, v))}
            >
              {v}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.block}>
        <h2>지금 내 조건</h2>
        <div className={styles.row}>
          <span>예산</span>
          <div className={styles.chips}>
            {BUDGETS.map((b) => (
              <button
                key={b.value}
                type="button"
                aria-pressed={budget === b.value}
                className={budget === b.value ? styles.on : ""}
                onClick={() => setBudget(b.value)}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.row}>
          <span>일주일에 쓸 수 있는 시간</span>
          <div className={styles.chips}>
            {HOURS.map((h) => (
              <button
                key={h}
                type="button"
                aria-pressed={hours === h}
                className={hours === h ? styles.on : ""}
                onClick={() => setHours(h)}
              >
                {h}시간
              </button>
            ))}
          </div>
        </div>
        <div className={styles.row}>
          <span>쓸 수 있는 장비</span>
          <div className={styles.chips}>
            {EQUIPMENTS.map((e) => (
              <button
                key={e.value}
                type="button"
                aria-pressed={equipment === e.value}
                className={equipment === e.value ? styles.on : ""}
                onClick={() => setEquipment(e.value)}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <button
        type="button"
        className={styles.go}
        disabled={!ready}
        onClick={() => setSubmitted(true)}
      >
        해볼 거리 보기
      </button>
      {!ready && (
        <p className={styles.meta}>
          분야나 중요한 것을 하나 이상 고르고, 예산·시간·장비를 모두 골라줘.
        </p>
      )}

      {result && (
        <section
          ref={resultsRef}
          className={styles.results}
          aria-live="polite"
        >
          {empty && (
            <p>
              고른 조건에 맞는 시도가 아직 목록에 없어. 분야나 조건을 바꿔서 다시
              골라봐.
            </p>
          )}

          {result.within.length > 0 && (
            <>
              <h2>지금 바로 해볼 수 있는 것</h2>
              {result.within.map((r) => (
                <Card key={r.item.id} rec={r} />
              ))}
            </>
          )}

          {result.withSupport.length > 0 && (
            <>
              <h2>
                {result.supports.length > 0
                  ? "지원받으면 가능한 길"
                  : "지금 조건을 넘지만 함께 볼 만한 것"}
              </h2>
              <p className={styles.meta}>
                {result.supports.length > 0
                  ? "지금 조건을 넘지만 같은 분야를 더 깊이 볼 수 있어. 아래 지원 안내와 함께 봐."
                  : "예산이나 장비가 지금 조건을 넘어. 더 가벼운 길이 있으면 함께 적어뒀어."}
              </p>
              {result.withSupport.map((r) => (
                <Card key={r.item.id} rec={r} support />
              ))}
            </>
          )}

          {result.supports.length > 0 && (
            <>
              <h2>지원 안내</h2>
              {result.supports.map((s) => (
                <article key={s.id} className={styles.card}>
                  <h3>{s.name}</h3>
                  <p>{s.summary}</p>
                  {s.eligibility && <p className={styles.meta}>{s.eligibility}</p>}
                  {s.sourceUrl && (
                    <p className={styles.meta}>
                      <a href={s.sourceUrl} target="_blank" rel="noreferrer">
                        출처
                      </a>
                      {s.lastChecked ? ` · 마지막 확인 ${s.lastChecked}` : ""}
                    </p>
                  )}
                </article>
              ))}
            </>
          )}
        </section>
      )}

      <LogSection interestedFields={fields} />

      <footer className={styles.foot}>
        추천은 확인된 목록 안에서만 해. 정보는 마지막 확인일 기준이야.
      </footer>
    </main>
  );
}
