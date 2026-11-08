import { getStore, normalizeCode, userFromCode } from "@/lib/account";
import { createGuard } from "@/lib/guard";
import { clientIp, noStore, setSession } from "@/lib/http";

// 코드 추측을 막기 위해 분당 5번까지.
const guard = createGuard({ perIpPerMinute: 5, perIpAiPerDay: 1e9, aiPerHour: 1e9 });

export async function POST(request: Request) {
  const store = getStore();
  if (!store) return Response.json({ error: "unavailable" }, { status: 503 });
  if (guard(clientIp(request)) === "blocked") {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }
  let raw: unknown;
  try {
    raw = (await request.json()).code;
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const code = typeof raw === "string" ? normalizeCode(raw) : null;
  const userId = code ? await userFromCode(store, code) : null;
  if (!code || !userId) return Response.json({ error: "not_found" }, { status: 404 });
  await setSession(code);
  return Response.json({ ok: true }, noStore);
}
