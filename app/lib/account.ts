import { createHash, randomBytes } from "node:crypto";
import { neonStore } from "./neon.ts";
import { memoryStore } from "./store.ts";
import type { Store } from "./store.ts";

export const COOKIE = "compass_acct";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

// Crockford base32: 헷갈리는 I L O U가 없는 32자. 16자 = 80비트라 추측할 수 없다.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function newCode(): string {
  const bytes = randomBytes(16);
  let s = "";
  for (const b of bytes) s += ALPHABET[b % 32];
  return s.match(/.{4}/g)!.join("-");
}

/** 학생이 띄어쓰기·소문자·하이픈 없이 적어도 같은 코드로 본다. */
export function normalizeCode(raw: string): string | null {
  const s = raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  if (s.length !== 16) return null;
  if (![...s].every((c) => ALPHABET.includes(c))) return null;
  return s.match(/.{4}/g)!.join("-");
}

export function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

let store: Store | null | undefined;

/** DATABASE_URL이 없으면 null: 계정 기능이 꺼지고 앱은 이 브라우저 저장만으로 동작한다. */
export function getStore(): Store | null {
  if (store === undefined) {
    const url = process.env.DATABASE_URL;
    if (url) store = neonStore(url);
    // 개발 중 화면 확인용 메모리 저장소. 운영에서는 절대 켜지지 않는다.
    else if (process.env.NODE_ENV !== "production" && process.env.COMPASS_DEV_MEMORY === "1")
      store = memoryStore();
    else store = null;
  }
  return store;
}

export async function signUp(s: Store): Promise<string> {
  const code = newCode();
  await s.createUser(hashCode(code));
  return code;
}

export async function userFromCode(s: Store, raw: string | undefined): Promise<string | null> {
  if (!raw) return null;
  const code = normalizeCode(raw);
  return code ? s.findUser(hashCode(code)) : null;
}
