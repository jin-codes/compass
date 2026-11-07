"use client";

import { useState } from "react";
import { advise } from "@/lib/advice";
import { localToday } from "@/lib/date";
import { ITEMS } from "@/lib/items";
import { addEntry, removeEntry, toText, useEntries } from "@/lib/log";
import type { Entry } from "@/lib/log";
import type { Item } from "@/lib/types";
import styles from "./page.module.css";

/** 도전 카드 안에서 쓰는 한 줄 회고 입력 */
export function RecordButton({
  itemId,
  title,
}: {
  itemId: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  if (saved) return <p className={styles.meta}>기록했어. 아래 &ldquo;내 기록&rdquo;에 쌓여.</p>;

  if (!open) {
    return (
      <button type="button" className={styles.ghost} onClick={() => setOpen(true)}>
        해봤어요
      </button>
    );
  }

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        if (!note.trim()) return;
        addEntry({ itemId, title, note: note.trim() });
        setSaved(true);
      }}
    >
      <label>
        무엇을 했고, 무엇을 알게 됐어? 한두 줄이면 돼.
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={500}
        />
      </label>
      <div className={styles.formRow}>
        <button type="submit" className={styles.ghost} disabled={!note.trim()}>
          기록 남기기
        </button>
        <button type="button" className={styles.link} onClick={() => setOpen(false)}>
          취소
        </button>
      </div>
    </form>
  );
}

/** 지금까지 해온 것을 쌓아 보여주는 곳. 계정 없이 이 브라우저에만 저장한다. */
function Suggest({ title, items }: { title: string; items: Item[] }) {
  if (items.length === 0) return null;
  return (
    <>
      <h3>{title}</h3>
      <ul className={styles.log}>
        {items.map((i) => (
          <li key={i.id} className={styles.card}>
            <b>{i.name}</b>
            <p>{i.summary}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

/** 기록을 읽고 다음 시도를 제안한다. 평가나 순위가 아니고, 고르는 건 학생이다. */
function AdviceBlock({
  entries,
  interestedFields,
}: {
  entries: Entry[];
  interestedFields: string[];
}) {
  const advice = advise(entries, ITEMS, interestedFields, localToday());
  if (!advice) return null;
  const { doneCount, topFields, topValues, untouchedInterests, deeper, broader } =
    advice;
  return (
    <div className={styles.block}>
      <h3>기록을 보니</h3>
      <p>
        도전 {doneCount}개를 해봤어. 가장 자주 닿은 분야는{" "}
        <b>{topFields.join(", ")}</b>
        {topValues.length > 0 && (
          <>
            , 자주 나온 가치는 <b>{topValues.join(", ")}</b>
          </>
        )}
        이야.
      </p>
      {untouchedInterests.length > 0 && (
        <p className={styles.meta}>
          끌린다고 고른 분야 중 {untouchedInterests.join(", ")}은 아직 해본
          기록이 없어. 말한 것과 해본 것이 다른지 살펴볼 만해.
        </p>
      )}
      <p className={styles.meta}>
        어느 쪽이 맞는지는 해본 네가 가장 잘 알아. 아래는 선택지일 뿐이야.
      </p>
      <Suggest title="같은 분야를 더 깊이" items={deeper} />
      <Suggest title="아직 안 가본 분야로 넓히기" items={broader} />
    </div>
  );
}

export function LogSection({
  interestedFields = [],
}: {
  interestedFields?: string[];
}) {
  const entries = useEntries();
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(toText(entries));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드가 막힌 환경에서는 조용히 넘어간다.
    }
  }

  return (
    <section className={styles.block}>
      <h2>내 기록</h2>
      <p className={styles.meta}>
        내가 실제로 해본 것을 남겨두는 곳이야. 이 브라우저에만 저장되고 서버로
        보내지 않아. 브라우저 데이터를 지우면 함께 사라져.
      </p>

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim() || !note.trim()) return;
          addEntry({ title: title.trim(), note: note.trim() });
          setTitle("");
          setNote("");
        }}
      >
        <label>
          한 일 (추천과 상관없이 직접 적어도 돼)
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
          />
        </label>
        <label>
          알게 된 것이나 느낀 점
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={500}
          />
        </label>
        <div className={styles.formRow}>
          <button
            type="submit"
            className={styles.ghost}
            disabled={!title.trim() || !note.trim()}
          >
            기록 추가
          </button>
        </div>
      </form>

      {entries.length > 0 && (
        <>
          <AdviceBlock entries={entries} interestedFields={interestedFields} />
          <ul className={styles.log}>
            {entries.map((e) => (
              <li key={e.id} className={styles.card}>
                <div className={styles.cardHead}>
                  <h3>{e.title}</h3>
                  <span className={styles.meta}>{e.date}</span>
                </div>
                <p>{e.note}</p>
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => removeEntry(e.id)}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
          <div className={styles.formRow}>
            <button type="button" className={styles.ghost} onClick={copy}>
              {copied ? "복사했어" : "텍스트로 복사"}
            </button>
            <span className={styles.meta}>자소서나 포트폴리오에 붙여넣을 수 있어.</span>
          </div>
        </>
      )}
    </section>
  );
}
