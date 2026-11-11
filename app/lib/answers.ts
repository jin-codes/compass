import { useSyncExternalStore } from "react";
import { cleanPicks } from "./questions";
import type { Picks } from "./questions";

/**
 * "나 알아가기" 답. 이 브라우저에만 저장한다. 서버로는 보내지 않고,
 * 해볼 거리를 찾을 때 분야·가치 태그(상위 3개씩)만 함께 보낸다.
 */
const KEY = "compass.answers.v1";
const EMPTY: Picks = {};
const listeners = new Set<() => void>();
let cache: Picks | null = null;

function read(): Picks {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? cleanPicks(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

export function setAnswers(next: Picks) {
  cache = next;
  try {
    if (Object.keys(next).length) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    // 저장이 막힌 환경에서는 이번 방문 동안만 유지된다.
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

function getSnapshot(): Picks {
  if (cache === null) cache = read();
  return cache;
}

export function useAnswers(): Picks {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}
