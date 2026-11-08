import { clearSession, noStore } from "@/lib/http";

export async function POST() {
  await clearSession();
  return Response.json({ ok: true }, noStore);
}
