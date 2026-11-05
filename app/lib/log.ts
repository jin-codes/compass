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

export function addEntry(e: Omit<Entry, "id" | "date">) {
  const entry: Entry = {
    ...e,
    id: crypto.randomUUID(),
    date: localToday(),
  };
  write([entry, ...getSnapshot()]);
}

export function removeEntry(id: string) {
  write(getSnapshot().filter((e) => e.id !== id));
}

/** 자소서나 포트폴리오에 붙여넣기 좋은 텍스트 */
export function toText(entries: Entry[]): string {
  return [...entries]
    .reverse()
    .map((e) => `${e.date} ${e.title}\n${e.note}`)
    .join("\n\n");
}
