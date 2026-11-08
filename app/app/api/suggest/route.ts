import { aiAvailable, readWithAI } from "@/lib/ai";
import { localToday } from "@/lib/date";
import { createGuard } from "@/lib/guard";
import { ITEMS } from "@/lib/items";
import { isPublishable } from "@/lib/recommend";
import { build, readBasic, sanitize } from "@/lib/suggest";
import type { Reading } from "@/lib/suggest";
import type { Budget, Constraints, Equipment } from "@/lib/types";

const BUDGETS: Budget[] = [0, 30000, 100000, -1];
const EQUIPMENTS: Equipment[] = ["phone", "laptop", "special"];
const MAX_TEXT = 500;

// 비용 보호. 인스턴스 안에서만 정확하다. 전체 상한은 방화벽 속도 제한과 Anthropic 월 한도가 맡는다.
const guard = createGuard({ perIpPerMinute: 6, perIpAiPerDay: 30, aiPerHour: 300 });

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim().slice(0, MAX_TEXT) : "";
  const budget = BUDGETS.find((b) => b === body.budget);
  const equipment = EQUIPMENTS.find((e) => e === body.equipment);
  const hours = typeof body.hours === "number" && body.hours > 0 && body.hours <= 40 ? body.hours : undefined;
  if (text.length < 2 || budget === undefined || equipment === undefined || hours === undefined) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const constraints: Constraints = { budget, hoursPerWeek: hours, equipment };

  const ip =
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown";
  const verdict = guard(ip);
  if (verdict === "blocked") return Response.json({ error: "rate_limited" }, { status: 429 });

  const today = localToday();
  const published = ITEMS.filter((i) => isPublishable(i, today));

  // 학생이 쓴 글은 저장하거나 기록하지 않는다. 읽는 동안만 쓴다.
  let reading: Reading = readBasic(text);
  let mode: "ai" | "basic" = "basic";
  if (aiAvailable() && verdict === "ai") {
    try {
      reading = sanitize(await readWithAI(text, published), published);
      mode = "ai";
    } catch {
      reading = readBasic(text);
    }
  }
  // AI를 쓸 수 있는데 한도 때문에 건너뛴 경우만 화면에 알린다.
  const busy = aiAvailable() && verdict === "keyword";

  return Response.json({
    ...build(ITEMS, reading, constraints, today, mode),
    ...(busy ? { busy: true } : {}),
  });
}
