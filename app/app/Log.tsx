"use client";

import { useRef, useState } from "react";
import { advise } from "@/lib/advice";
import { localToday } from "@/lib/date";
import { EXAMPLES, EXAMPLE_FIELDS, FIELD_INFO, LEVELS } from "@/lib/examples";
import type { Example, ExampleField, LevelId } from "@/lib/examples";
import { profile } from "@/lib/profile";
import { ITEMS } from "@/lib/items";
import {
  addEntry,
  createAccount,
  deleteAccount,
  localEntryCount,
  loginWithCode,
  logout,
  removeEntry,
  toText,
  useAccount,
  useEntries,
} from "@/lib/log";
import type { Entry } from "@/lib/log";
import type { Item } from "@/lib/types";
import styles from "./page.module.css";

/** 도전 카드 안에서 쓰는 한 줄 회고 입력 */
export function RecordButton({
  itemId,
  title,
  onOpenLog,
}: {
  itemId: string;
  title: string;
  onOpenLog?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  if (saved) {
    return (
      <div className={styles.formRow}>
        <span className={styles.meta}>기록했어.</span>
        {onOpenLog && (
          <button type="button" className={styles.primary} onClick={onOpenLog}>
            다음에 해볼 갈래 보기
          </button>
        )}
      </div>
    );
  }

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
        {doneCount > 0 ? `도전 ${doneCount}개를 포함해, ` : "남겨둔 기록을 보면 "}
        가장 자주 닿은 분야는{" "}
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

/** 해본 일에서 읽히는 면. 진단이 아니라 가설이고, 맞는지는 학생이 판단한다. */
function ProfileBlock({ entries }: { entries: Entry[] }) {
  const p = profile(entries);
  if (!p) return null;
  const deepFields = p.fieldStages.filter((f) => f.stage === "deep").map((f) => f.field);
  const growing = p.fieldStages.filter((f) => f.stage === "growing").map((f) => f.field);
  const tasted = p.fieldStages.filter((f) => f.stage === "taste").map((f) => f.field);
  return (
    <div className={styles.block}>
      <h3>해본 일 돌아보기</h3>
      <p className={styles.meta}>
        {deepFields.length > 0 && <>깊이 들어가 본 분야: {deepFields.join(", ")}. </>}
        {growing.length > 0 && <>자리를 잡아가는 분야: {growing.join(", ")}. </>}
        {tasted.length > 0 && <>맛본 분야: {tasted.join(", ")}. </>}
        해본 분야는 {p.breadth}가지
        {p.spanDays > 0 && <>, 첫 기록부터 {p.spanDays}일에 걸쳐 남겼어</>}
        {p.outputCount > 0 && <>, 결과물을 낸 일이 {p.outputCount}개 있어</>}.
      </p>
    </div>
  );
}

/** 서버 저장(선택). 켜기 전에는 이 브라우저에만 저장된다. 이름·이메일 없이 복구 코드 하나로 쓴다. */
function AccountCard() {
  const acct = useAccount();
  const [step, setStep] = useState<"idle" | "notice" | "code" | "login">("idle");
  const [code, setCode] = useState("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);

  if (!acct.loaded || !acct.enabled) return null;

  if (acct.signedIn && step !== "code") {
    return (
      <div className={styles.addForm}>
        <h3>서버에 저장 중</h3>
        <p className={styles.meta}>
          기록이 서버에 저장되고 있어. 복구 코드로 다른 기기에서도 이어 볼 수 있어. 코드는
          다시 보여줄 수 없어서, 잃어버리면 기록을 찾을 수 없어.
        </p>
        <div className={styles.formRow}>
          <button
            type="button"
            className={styles.ghost}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await logout();
              setBusy(false);
              setStep("idle");
              setMsg("이 기기에서 나왔어. 이 기기에 있던 기록 복사본은 지웠어.");
            }}
          >
            이 기기에서 나가기
          </button>
          <button
            type="button"
            className={styles.link}
            disabled={busy}
            onClick={async () => {
              if (
                !window.confirm(
                  "서버에 저장된 기록과 계정을 모두 지워. 되돌릴 수 없어. 지울까?"
                )
              )
                return;
              setBusy(true);
              const ok = await deleteAccount();
              setBusy(false);
              setMsg(ok ? "서버 기록을 모두 지웠어." : "지우지 못했어. 잠시 뒤 다시 해줘.");
            }}
          >
            서버 기록 모두 지우기
          </button>
        </div>
        {msg && <p className={styles.meta}>{msg}</p>}
      </div>
    );
  }

  if (step === "code") {
    return (
      <div className={styles.addForm}>
        <h3>복구 코드를 적어둬</h3>
        <p className={styles.codeBox}>{code}</p>
        <p className={styles.meta}>
          이 코드가 열쇠야. 화면에서는 지금 한 번만 보여줘. 서버는 코드를 저장하지 않아서
          잃어버리면 우리도 찾아줄 수 없어. 메모장이나 사진으로 남겨둬. 남에게는 알려주지 마.
        </p>
        <div className={styles.formRow}>
          <button
            type="button"
            className={styles.ghost}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code);
                setCopied(true);
              } catch {
                // 클립보드가 막히면 직접 적게 둔다.
              }
            }}
          >
            {copied ? "복사했어" : "코드 복사"}
          </button>
          <button
            type="button"
            className={styles.primary}
            onClick={() => {
              setCode("");
              setCopied(false);
              setStep("idle");
            }}
          >
            적어뒀어
          </button>
        </div>
      </div>
    );
  }

  if (step === "notice") {
    return (
      <div className={styles.addForm}>
        <h3>서버에 저장 켜기</h3>
        <p className={styles.meta}>
          켜면 네가 남긴 기록(한 일, 적은 글, 날짜)이 우리 서버의 데이터베이스에 저장돼.
          이름·이메일은 받지 않고 복구 코드만 써. 개인을 알아볼 수 있는 내용(이름·학교·연락처)은
          기록에 쓰지 마. 언제든 &ldquo;서버 기록 모두 지우기&rdquo;로 지울 수 있어. 첫 화면에 쓰는
          글은 지금처럼 저장하지 않아.
        </p>
        <div className={styles.formRow}>
          <button
            type="button"
            className={styles.primary}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const c = await createAccount();
              setBusy(false);
              if (c) {
                setCode(c);
                setMsg("");
                setStep("code");
              } else setMsg("저장을 켜지 못했어. 잠시 뒤 다시 해줘.");
            }}
          >
            {busy ? "켜는 중…" : "켜기"}
          </button>
          <button type="button" className={styles.link} onClick={() => setStep("idle")}>
            취소
          </button>
        </div>
        {msg && <p className={styles.meta}>{msg}</p>}
      </div>
    );
  }

  if (step === "login") {
    return (
      <form
        className={styles.addForm}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!input.trim()) return;
          let merge = false;
          if (localEntryCount() > 0) {
            merge = window.confirm(
              `이 기기에 기록이 ${localEntryCount()}개 있어. 이 계정에 합칠까?\n(취소하면 이 기기의 기록은 지우고 계정의 기록만 보여줘. 다른 사람과 같이 쓰는 기기면 취소를 눌러.)`
            );
          }
          setBusy(true);
          const r = await loginWithCode(input, merge);
          setBusy(false);
          if (r === "ok") {
            setInput("");
            setMsg("");
            setStep("idle");
          } else {
            setMsg(
              r === "not_found"
                ? "그 코드는 찾을 수 없어. 다시 확인해줘."
                : r === "rate_limited"
                  ? "너무 자주 눌렀어. 잠시 뒤 다시 해줘."
                  : "연결하지 못했어. 잠시 뒤 다시 해줘."
            );
          }
        }}
      >
        <h3>복구 코드로 들어가기</h3>
        <label>
          복구 코드
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <div className={styles.formRow}>
          <button type="submit" className={styles.primary} disabled={busy || !input.trim()}>
            {busy ? "확인 중…" : "들어가기"}
          </button>
          <button type="button" className={styles.link} onClick={() => setStep("idle")}>
            취소
          </button>
        </div>
        {msg && <p className={styles.meta}>{msg}</p>}
      </form>
    );
  }

  return (
    <div className={styles.addForm}>
      <h3>다른 기기에서도 보고 싶어?</h3>
      <p className={styles.meta}>
        지금은 이 브라우저에만 저장돼. 서버 저장을 켜면 복구 코드로 다른 기기에서 이어 볼 수
        있어. 이름이나 이메일은 필요 없어.
      </p>
      <div className={styles.formRow}>
        <button type="button" className={styles.ghost} onClick={() => setStep("notice")}>
          서버에 저장 켜기
        </button>
        <button type="button" className={styles.link} onClick={() => setStep("login")}>
          복구 코드가 있어요
        </button>
      </div>
      {msg && <p className={styles.meta}>{msg}</p>}
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
  const [justSaved, setJustSaved] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [pickField, setPickField] = useState<ExampleField>(EXAMPLE_FIELDS[0]);
  const [pickLevel, setPickLevel] = useState<LevelId>("taste");
  const [picked, setPicked] = useState<{
    field: ExampleField;
    depth: 1 | 2 | 3;
    ex: Example;
  } | null>(null);

  function submit() {
    if (!title.trim()) return;
    addEntry({
      title: title.trim(),
      note: note.trim(),
      ...(picked && {
        field: picked.field,
        depth: picked.depth,
        dims: picked.ex.dims,
      }),
    });
    setPicked(null);
    setTitle("");
    setNote("");
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  }

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
        내가 실제로 해본 것을 남겨두는 곳이야. 서버 저장을 켜기 전에는 이 브라우저에만
        저장되고 서버로 보내지 않아. 이때는 브라우저 데이터를 지우면 함께 사라져.
      </p>

      <AccountCard />

      {entries.length > 0 ? (
        <>
          <AdviceBlock entries={entries} interestedFields={interestedFields} />
          <ProfileBlock entries={entries} />
        </>
      ) : (
        <p className={styles.empty}>
          아직 기록이 없어. 찾기에서 도전을 하나 해보고 &ldquo;해봤어요&rdquo;를 눌러봐.
          기록이 쌓이면 다음에 해볼 갈래를 알려줄게.
        </p>
      )}

      <form
        className={styles.addForm}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <h3>한 일 적기</h3>
        <p className={styles.meta}>
          막막하면 분야를 고르고 예시를 눌러봐. 고쳐 써도 되고, 그냥 직접 써도 돼.
        </p>
        <div className={styles.chipRow} role="group" aria-label="분야">
          {EXAMPLE_FIELDS.map((f) => (
            <button
              key={f}
              type="button"
              className={f === pickField ? styles.on : undefined}
              aria-pressed={f === pickField}
              onClick={(e) => {
                setPickField(f);
                e.currentTarget.scrollIntoView?.({
                  inline: "center",
                  block: "nearest",
                  behavior: "smooth",
                });
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <p className={styles.meta}>{FIELD_INFO[pickField].feature}</p>
        <div className={styles.seg} role="group" aria-label="깊이">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              type="button"
              className={l.id === pickLevel ? styles.on : undefined}
              aria-pressed={l.id === pickLevel}
              onClick={() => setPickLevel(l.id)}
            >
              <b>{l.label}</b>
              <span>{l.hint}</span>
            </button>
          ))}
        </div>
        <div className={styles.exList}>
          {EXAMPLES[pickField][pickLevel].map((ex) => (
            <button
              key={ex.text}
              type="button"
              className={picked?.ex.text === ex.text ? styles.on : undefined}
              onClick={() => {
                setTitle(ex.text);
                setPicked({
                  field: pickField,
                  depth: (LEVELS.findIndex((l) => l.id === pickLevel) + 1) as 1 | 2 | 3,
                  ex,
                });
                noteRef.current?.focus();
              }}
            >
              {ex.text}
            </button>
          ))}
        </div>
        <label>
          한 일
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!e.target.value.trim()) setPicked(null);
            }}
            maxLength={80}
            placeholder="예: 학급 설문을 만들어 결과를 정리했다"
          />
        </label>
        <label>
          알게 된 것이나 느낀 점 <span className={styles.meta}>(나중에 안 적어도 돼)</span>
          <textarea
            ref={noteRef}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            rows={3}
            maxLength={500}
          />
        </label>
        <div className={styles.formRow}>
          <button type="submit" className={styles.primary} disabled={!title.trim()}>
            기록 남기기
          </button>
          {justSaved && <span className={styles.meta}>기록했어. 아래에 쌓였어.</span>}
        </div>
      </form>

      {entries.length > 0 && (
        <>
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
