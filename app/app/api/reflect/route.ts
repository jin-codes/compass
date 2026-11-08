import { aiAvailable, reflectWithAI } from "@/lib/ai";
import { localToday } from "@/lib/date";
import { createGuard } from "@/lib/guard";
import { clientIp } from "@/lib/http";
import { ITEMS } from "@/lib/items";
import { isPublishable } from "@/lib/recommend";
import { basicReflect, sanitizeReflect } from "@/lib/reflect";

const guard = createGuard({ perIpPerMinute: 10, perIpAiPerDay: 40, aiPerHour: 300 });

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 80) : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
  const doneIds = Array.isArray(body.doneIds)
    ? body.doneIds.filter((x): x is string => typeof x === "string").slice(0, 100)
    : [];
  if (title.length < 2) return Response.json({ error: "bad_request" }, { status: 400 });

  const verdict = guard(clientIp(request));
  if (verdict === "blocked") return Response.json({ error: "rate_limited" }, { status: 429 });

  const published = ITEMS.filter((i) => isPublishable(i, localToday()));

  // 학생이 쓴 글은 저장하거나 기록하지 않는다. 읽는 동안만 쓴다.
  if (aiAvailable() && verdict === "ai") {
    try {
      const r = sanitizeReflect(await reflectWithAI(title, note, published), published, doneIds);
      if (r) return Response.json(r);
    } catch {
      // 아래 기본 반응으로 넘어간다.
    }
  }
  return Response.json(basicReflect(title, note, published, doneIds));
}
