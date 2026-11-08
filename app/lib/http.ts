import { cookies } from "next/headers";
import { COOKIE, COOKIE_MAX_AGE, getStore, userFromCode } from "./account";
import type { Store } from "./store";

export function clientIp(request: Request): string {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown"
  );
}

export async function setSession(code: string) {
  (await cookies()).set(COOKIE, code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

/** 쿠키로 로그인한 사용자. 계정 기능이 꺼져 있거나 로그인 전이면 null. */
export async function currentUser(): Promise<{ store: Store; userId: string } | null> {
  const store = getStore();
  if (!store) return null;
  const userId = await userFromCode(store, (await cookies()).get(COOKIE)?.value);
  return userId ? { store, userId } : null;
}

export const noStore = { headers: { "Cache-Control": "no-store" } };
