import { checkEntries } from "@/lib/entry-check";
import { currentUser, noStore } from "@/lib/http";

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(
    { entries: await user.store.listEntries(user.userId) },
    noStore
  );
}

/** 기록을 올린다. id가 같으면 덮어쓴다. */
export async function PUT(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  let entries;
  try {
    entries = checkEntries((await request.json()).entries);
  } catch {
    entries = null;
  }
  if (!entries) return Response.json({ error: "bad_request" }, { status: 400 });
  await user.store.upsertEntries(user.userId, entries);
  return Response.json({ ok: true, count: entries.length }, noStore);
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  await user.store.deleteEntry(user.userId, id);
  return Response.json({ ok: true }, noStore);
}
