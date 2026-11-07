import { aiAvailable, readWithAI } from "@/lib/ai";
import { localToday } from "@/lib/date";
import { ITEMS } from "@/lib/items";
import { isPublishable } from "@/lib/recommend";
import { build, readBasic, sanitize } from "@/lib/suggest";
import type { Reading } from "@/lib/suggest";
import type { Budget, Constraints, Equipment } from "@/lib/types";

const BUDGETS: Budget[] = [0, 30000, 100000, -1];
const EQUIPMENTS: Equipment[] = ["phone", "laptop", "special"];
const MAX_TEXT = 500;

// 비용 보호용 느슨한 제한. 서버 인스턴스마다 따로 세므로 정확하지 않다.
const hitsByIp = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hitsByIp.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hitsByIp.set(ip, recent);
  if (hitsByIp.size > 5000) hitsByIp.clear();
  return recent.length > 8;
}

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

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (limited(ip)) return Response.json({ error: "rate_limited" }, { status: 429 });

  const today = localToday();
  const published = ITEMS.filter((i) => isPublishable(i, today));

  // 학생이 쓴 글은 저장하거나 기록하지 않는다. 읽는 동안만 쓴다.
  let reading: Reading = readBasic(text);
  let mode: "ai" | "basic" = "basic";
  if (aiAvailable()) {
    try {
      reading = sanitize(await readWithAI(text, published), published);
      mode = "ai";
    } catch {
      reading = readBasic(text);
    }
  }

  return Response.json(build(ITEMS, reading, constraints, today, mode));
}
