import { useSyncExternalStore } from "react";
import { localToday } from "./date";

export interface Entry {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** 연결된 도전의 id. 도전과 무관하게 직접 적은 기록이면 없다. */
  itemId?: string;
  title: string;
  note: string;
  /**
   * 예시에서 골랐을 때만 붙는, 해본 일의 분야·깊이(1~3)·경향 코드.
   * 분석에만 쓰고 학생에게 숫자로 보이지 않는다. 직접 쓴 기록에는 없다.
   */
  field?: string;
  depth?: 1 | 2 | 3;
  dims?: string[];
}

const KEY = "compass.log.v1";
const EMPTY: Entry[] = [];
const listeners = new Set<() => void>();
let cache: Entry[] | null = null;

function read(): Entry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(next: Entry[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 저장이 막힌 환경(시크릿 모드 등)에서는 이번 방문 동안만 유지된다.
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): Entry[] {
  if (cache === null) cache = read();
  return cache;
}

export function useEntries(): Entry[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function addEntry(e: Omit<Entry, "id" | "date">): string {
  const entry: Entry = {
    ...e,
    id: crypto.randomUUID(),
    date: localToday(),
  };
  write([entry, ...getSnapshot()]);
  if (acct.signedIn) void push([entry]);
  return entry.id;
}

/** AI가 한 질문과 학생의 답을 그 기록의 회고 글 뒤에 붙인다. 새 필드는 만들지 않는다. */
export function appendAnswer(id: string, question: string, answer: string) {
  const cur = getSnapshot();
  const e = cur.find((x) => x.id === id);
  if (!e || !answer.trim()) return;
  const add = `Q. ${question.trim()}\nA. ${answer.trim()}`;
  const updated: Entry = { ...e, note: (e.note ? `${e.note}\n\n${add}` : add).slice(0, 1200) };
  write(cur.map((x) => (x.id === id ? updated : x)));
  if (acct.signedIn) void push([updated]);
}

export function removeEntry(id: string) {
  write(getSnapshot().filter((e) => e.id !== id));
  if (acct.signedIn) {
    fetch(`/api/entries?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }
}

/* ---------- 서버 저장(선택). 켜기 전에는 이 브라우저에만 저장한다. ---------- */

export interface AccountState {
  loaded: boolean;
  /** 서버에 DB가 연결돼 있어 저장을 켤 수 있는지 */
  enabled: boolean;
  signedIn: boolean;
}

let acct: AccountState = { loaded: false, enabled: false, signedIn: false };
const acctListeners = new Set<() => void>();

function setAcct(next: Partial<AccountState>) {
  acct = { ...acct, ...next };
  acctListeners.forEach((l) => l());
}

function subscribeAcct(cb: () => void) {
  acctListeners.add(cb);
  return () => {
    acctListeners.delete(cb);
  };
}

const SERVER_ACCT: AccountState = { loaded: false, enabled: false, signedIn: false };

export function useAccount(): AccountState {
  return useSyncExternalStore(subscribeAcct, () => acct, () => SERVER_ACCT);
}

async function push(list: Entry[]): Promise<boolean> {
  try {
    for (let i = 0; i < list.length; i += 200) {
      const r = await fetch("/api/entries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: list.slice(i, i + 200) }),
      });
      if (!r.ok) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** 서버 기록을 받아온다. mergeLocal이면 이 기기에만 있던 기록은 서버로 올린다. */
async function pull(mergeLocal: boolean): Promise<boolean> {
  try {
    const r = await fetch("/api/entries", { cache: "no-store" });
    if (!r.ok) return false;
    const server: Entry[] = (await r.json()).entries ?? [];
    const serverIds = new Set(server.map((e) => e.id));
    const localOnly = mergeLocal ? getSnapshot().filter((e) => !serverIds.has(e.id)) : [];
    const merged = [...server, ...localOnly].sort((a, b) => b.date.localeCompare(a.date));
    write(merged);
    if (localOnly.length) await push(localOnly);
    return true;
  } catch {
    return false;
  }
}

/** 앱이 열릴 때 한 번 부른다. 로그인돼 있으면 서버와 맞춘다. */
export async function refreshAccount() {
  try {
    const r = await fetch("/api/account", { cache: "no-store" });
    const j = await r.json();
    setAcct({ loaded: true, enabled: !!j.enabled, signedIn: !!j.signedIn });
    if (j.signedIn) await pull(true);
  } catch {
    setAcct({ loaded: true });
  }
}

/** 서버 저장을 켠다. 복구 코드를 돌려준다(이때 한 번만 볼 수 있다). 실패하면 null. */
export async function createAccount(): Promise<string | null> {
  try {
    const r = await fetch("/api/account", { method: "POST" });
    if (!r.ok) return null;
    const { code } = await r.json();
    setAcct({ signedIn: true });
    await push(getSnapshot());
    return code as string;
  } catch {
    return null;
  }
}

/**
 * 복구 코드로 들어간다. mergeLocal이 true면 이 기기의 기록을 계정에 합치고,
 * false면 이 기기의 기록은 버리고 계정 기록만 보여준다(공용 기기에서 남의 기록이 섞이지 않게).
 */
export async function loginWithCode(
  code: string,
  mergeLocal: boolean
): Promise<"ok" | "not_found" | "rate_limited" | "error"> {
  try {
    const r = await fetch("/api/account/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (r.status === 404) return "not_found";
    if (r.status === 429) return "rate_limited";
    if (!r.ok) return "error";
    setAcct({ signedIn: true });
    return (await pull(mergeLocal)) ? "ok" : "error";
  } catch {
    return "error";
  }
}

/** 이 기기에서 나간다. 기록은 서버에 남고, 이 기기에 있던 복사본은 지운다. */
export async function logout() {
  try {
    await fetch("/api/account/logout", { method: "POST" });
  } catch {
    // 네트워크가 없어도 이 기기에서는 나간 것으로 본다.
  }
  setAcct({ signedIn: false });
  write([]);
}

/** 서버의 계정과 기록, 이 기기의 복사본을 모두 지운다. */
export async function deleteAccount(): Promise<boolean> {
  try {
    const r = await fetch("/api/account", { method: "DELETE" });
    if (!r.ok) return false;
  } catch {
    return false;
  }
  setAcct({ signedIn: false });
  write([]);
  return true;
}

export function localEntryCount(): number {
  return getSnapshot().length;
}

/** 자소서나 포트폴리오에 붙여넣기 좋은 텍스트 */
export function toText(entries: Entry[]): string {
  return [...entries]
    .reverse()
    .map((e) => `${e.date} ${e.title}\n${e.note}`)
    .join("\n\n");
}
