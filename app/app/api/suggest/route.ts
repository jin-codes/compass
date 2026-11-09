import { aiAvailable, readWithAI } from "@/lib/ai";
import { localToday } from "@/lib/date";
import { createGuard } from "@/lib/guard";
import { ITEMS } from "@/lib/items";
import { cleanHints } from "@/lib/questions";
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
  const hintsIn = cleanHints(body.hints);
  const hasHints = hintsIn.fields.length + hintsIn.values.length > 0;
  if ((text.length < 2 && !hasHints) || budget === undefined || equipment === undefined || hours === undefined) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const hints = hintsIn;
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
  // 글 없이 질문지만 고른 경우에는 읽을 글이 없으니 AI를 부르지 않는다.
  if (aiAvailable() && verdict === "ai" && text.length >= 2) {
    try {
      reading = sanitize(await readWithAI(text, published), published);
      mode = "ai";
    } catch {
      reading = readBasic(text);
    }
  }
  // 학생이 질문지에서 직접 고른 선택을 읽은 결과에 합친다. AI 호출은 늘지 않는다.
  reading = {
    ...reading,
    fields: [...new Set([...reading.fields, ...hints.fields])],
    values: [...new Set([...reading.values, ...hints.values])],
  };
  // AI를 쓸 수 있는데 한도 때문에 건너뛴 경우만 화면에 알린다.
  const busy = aiAvailable() && verdict === "keyword" && text.length >= 2;

  return Response.json({
    ...build(ITEMS, reading, constraints, today, mode),
    ...(busy ? { busy: true } : {}),
  });
}
