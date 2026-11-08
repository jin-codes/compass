import { getStore, signUp } from "@/lib/account";
import { createGuard } from "@/lib/guard";
import { clearSession, clientIp, currentUser, noStore, setSession } from "@/lib/http";

// 계정 만들기는 분당 3번까지. (AI 한도는 쓰지 않는다.)
const guard = createGuard({ perIpPerMinute: 3, perIpAiPerDay: 1e9, aiPerHour: 1e9 });

/** 계정 기능이 켜져 있는지, 이 브라우저가 로그인된 상태인지 */
export async function GET() {
  const enabled = getStore() !== null;
  const user = enabled ? await currentUser() : null;
  return Response.json({ enabled, signedIn: user !== null }, noStore);
}

/** 새 계정을 만들고 복구 코드를 한 번만 돌려준다. 서버에는 코드의 해시만 남는다. */
export async function POST(request: Request) {
  const store = getStore();
  if (!store) return Response.json({ error: "unavailable" }, { status: 503 });
  if (guard(clientIp(request)) === "blocked") {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }
  const code = await signUp(store);
  await setSession(code);
  return Response.json({ code }, noStore);
}

/** 계정과 서버에 있는 기록을 모두 지운다. */
export async function DELETE() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  await user.store.deleteUser(user.userId);
  await clearSession();
  return Response.json({ ok: true }, noStore);
}
