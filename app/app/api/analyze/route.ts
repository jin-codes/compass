import { aiAvailable, analyzeWithAI } from "@/lib/ai";
import {
  MAX_ENTRIES_FOR_ANALYSIS,
  MIN_ENTRIES_FOR_ANALYSIS,
  sanitizeAnalysis,
} from "@/lib/analyze";
import { localToday } from "@/lib/date";
import { createGuard } from "@/lib/guard";
import { clientIp } from "@/lib/http";
import { ITEMS } from "@/lib/items";
import { isPublishable } from "@/lib/recommend";

// 종합 분석은 입력이 길어서 하루 횟수를 작게 잡는다.
const guard = createGuard({ perIpPerMinute: 4, perIpAiPerDay: 10, aiPerHour: 100 });

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const str = (x: unknown, max: number) => (typeof x === "string" ? x.trim().slice(0, max) : "");
  const entries = (Array.isArray(body.entries) ? body.entries : [])
    .slice(0, MAX_ENTRIES_FOR_ANALYSIS)
    .map((e: Record<string, unknown>) => ({
      date: str(e?.date, 10),
      title: str(e?.title, 80),
      note: str(e?.note, 1200),
    }))
    .filter((e) => e.title);
  const doneIds = Array.isArray(body.doneIds)
    ? body.doneIds.filter((x): x is string => typeof x === "string").slice(0, 100)
    : [];
  if (entries.length < MIN_ENTRIES_FOR_ANALYSIS) {
    return Response.json({ error: "too_few" }, { status: 400 });
  }

  const verdict = guard(clientIp(request));
  if (verdict === "blocked") return Response.json({ error: "rate_limited" }, { status: 429 });
  // 키워드로는 종합할 수 없다. 사용할 수 없으면 솔직히 알린다.
  if (!aiAvailable() || verdict !== "ai") {
    return Response.json({ error: "unavailable" }, { status: 503 });
  }

  const published = ITEMS.filter((i) => isPublishable(i, localToday()));
  try {
    // 학생이 쓴 글은 저장하거나 기록하지 않는다. 읽는 동안만 쓴다.
    const a = sanitizeAnalysis(await analyzeWithAI(entries, published), published, doneIds);
    if (a) return Response.json({ mode: "ai", ...a });
  } catch {
    // 아래 오류로 넘어간다.
  }
  return Response.json({ error: "unavailable" }, { status: 503 });
}
