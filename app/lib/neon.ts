import { neon } from "@neondatabase/serverless";
import type { Entry } from "./log.ts";
import type { Store } from "./store.ts";

/**
 * Neon(Postgres) 저장소. 이름·이메일·IP는 저장하지 않는다.
 * 복구 코드는 해시만 저장한다(코드 자체는 서버에 남지 않는다).
 */
export function neonStore(url: string): Store {
  const sql = neon(url);
  let ready: Promise<unknown> | null = null;

  // 표가 없으면 처음 한 번 만든다.
  const ensure = () =>
    (ready ??= (async () => {
      await sql`CREATE TABLE IF NOT EXISTS accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code_hash text UNIQUE NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS entries (
        account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        id text NOT NULL,
        date text NOT NULL,
        item_id text,
        title text NOT NULL,
        note text NOT NULL,
        field text,
        depth smallint,
        dims text,
        PRIMARY KEY (account_id, id)
      )`;
    })().catch((e) => {
      ready = null;
      throw e;
    }));

  return {
    async createUser(hash) {
      await ensure();
      const rows = await sql`INSERT INTO accounts (code_hash) VALUES (${hash}) RETURNING id`;
      return rows[0].id as string;
    },
    async findUser(hash) {
      await ensure();
      const rows = await sql`SELECT id FROM accounts WHERE code_hash = ${hash}`;
      return rows.length ? (rows[0].id as string) : null;
    },
    async deleteUser(id) {
      await ensure();
      await sql`DELETE FROM accounts WHERE id = ${id}`;
    },
    async listEntries(id) {
      await ensure();
      const rows = await sql`SELECT id, date, item_id, title, note, field, depth, dims
        FROM entries WHERE account_id = ${id} ORDER BY date DESC, id`;
      return rows.map((r) => {
        const e: Entry = {
          id: r.id as string,
          date: r.date as string,
          title: r.title as string,
          note: r.note as string,
        };
        if (r.item_id) e.itemId = r.item_id as string;
        if (r.field) e.field = r.field as string;
        if (r.depth) e.depth = r.depth as 1 | 2 | 3;
        if (r.dims) e.dims = (r.dims as string).split("");
        return e;
      });
    },
    async upsertEntries(id, list) {
      await ensure();
      if (!list.length) return;
      await sql.transaction(
        list.map(
          (e) => sql`INSERT INTO entries (account_id, id, date, item_id, title, note, field, depth, dims)
            VALUES (${id}, ${e.id}, ${e.date}, ${e.itemId ?? null}, ${e.title}, ${e.note},
                    ${e.field ?? null}, ${e.depth ?? null}, ${e.dims?.join("") ?? null})
            ON CONFLICT (account_id, id) DO UPDATE SET
              date = EXCLUDED.date, item_id = EXCLUDED.item_id, title = EXCLUDED.title,
              note = EXCLUDED.note, field = EXCLUDED.field, depth = EXCLUDED.depth,
              dims = EXCLUDED.dims`
        )
      );
    },
    async deleteEntry(id, entryId) {
      await ensure();
      await sql`DELETE FROM entries WHERE account_id = ${id} AND id = ${entryId}`;
    },
  };
}
