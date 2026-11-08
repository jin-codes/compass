import { DIMS } from "./examples.ts";
import type { Entry } from "./log.ts";

/** 서버가 받는 기록은 전부 여기서 걸러서 만든다. 모양이 맞지 않으면 버린다. */
export const MAX_ENTRIES = 500;

const ID = /^[A-Za-z0-9_-]{1,64}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function checkEntry(x: unknown): Entry | null {
  if (typeof x !== "object" || x === null) return null;
  const o = x as Record<string, unknown>;
  if (typeof o.id !== "string" || !ID.test(o.id)) return null;
  if (typeof o.date !== "string" || !DATE.test(o.date)) return null;
  if (typeof o.title !== "string" || !o.title.trim()) return null;
  if (typeof o.note !== "string") return null;

  const e: Entry = {
    id: o.id,
    date: o.date,
    title: o.title.trim().slice(0, 80),
    note: o.note.trim().slice(0, 1200),
  };
  if (typeof o.itemId === "string" && ID.test(o.itemId)) e.itemId = o.itemId;
  if (typeof o.field === "string" && o.field.length <= 30) e.field = o.field;
  if (o.depth === 1 || o.depth === 2 || o.depth === 3) e.depth = o.depth;
  if (Array.isArray(o.dims)) {
    e.dims = o.dims.filter((d): d is string => typeof d === "string" && d in DIMS).slice(0, 6);
  }
  return e;
}

export function checkEntries(x: unknown): Entry[] | null {
  if (!Array.isArray(x) || x.length > MAX_ENTRIES) return null;
  const out: Entry[] = [];
  for (const item of x) {
    const e = checkEntry(item);
    if (e) out.push(e);
  }
  return out;
}
