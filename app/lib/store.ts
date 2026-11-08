import type { Entry } from "./log.ts";

/** 서버 저장소. 운영은 Neon(Postgres), 테스트는 메모리. */
export interface Store {
  createUser(codeHash: string): Promise<string>;
  findUser(codeHash: string): Promise<string | null>;
  /** 계정과 그 기록을 모두 지운다. */
  deleteUser(userId: string): Promise<void>;
  listEntries(userId: string): Promise<Entry[]>;
  /** id가 같으면 덮어쓴다. */
  upsertEntries(userId: string, entries: Entry[]): Promise<void>;
  deleteEntry(userId: string, id: string): Promise<void>;
}

export function memoryStore(): Store {
  const users = new Map<string, string>(); // codeHash -> userId
  const entries = new Map<string, Map<string, Entry>>(); // userId -> id -> entry
  let n = 0;
  return {
    async createUser(h) {
      const id = `u${++n}`;
      users.set(h, id);
      entries.set(id, new Map());
      return id;
    },
    async findUser(h) {
      return users.get(h) ?? null;
    },
    async deleteUser(id) {
      for (const [h, u] of users) if (u === id) users.delete(h);
      entries.delete(id);
    },
    async listEntries(id) {
      return [...(entries.get(id)?.values() ?? [])].sort((a, b) =>
        b.date.localeCompare(a.date)
      );
    },
    async upsertEntries(id, list) {
      const m = entries.get(id);
      if (m) for (const e of list) m.set(e.id, e);
    },
    async deleteEntry(id, entryId) {
      entries.get(id)?.delete(entryId);
    },
  };
}
