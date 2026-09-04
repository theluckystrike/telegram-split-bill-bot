import { BaseStore, FleetStats, now } from "./kit.ts";
import type { Expense } from "./parse.ts";

export interface ExpenseRow { id: number; chat_id: number; payer: string; cents: number; desc: string; participants: string; created: number; }
export interface GroupRow { chat_id: number; title: string; pro: number; lang: string; currency: string; weekly_sent: number; nudged_at: number; }

const SCHEMA = `
CREATE TABLE IF NOT EXISTS groups (chat_id INTEGER PRIMARY KEY, title TEXT NOT NULL DEFAULT '', pro INTEGER NOT NULL DEFAULT 0, paid_charge TEXT, tip_shown INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS members (chat_id INTEGER NOT NULL, handle TEXT NOT NULL, user_id INTEGER, last_seen INTEGER NOT NULL, PRIMARY KEY (chat_id, handle));
CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id INTEGER NOT NULL, payer TEXT NOT NULL, cents INTEGER NOT NULL,
  desc TEXT NOT NULL, participants TEXT NOT NULL, created INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS exp_chat ON expenses(chat_id, deleted, created);
CREATE TABLE IF NOT EXISTS sources (user_id INTEGER PRIMARY KEY, src TEXT NOT NULL, ts INTEGER NOT NULL);`;

export class Store extends BaseStore {
  constructor(ctx: DurableObjectState, env: Record<string, unknown>) {
    super(ctx, env, SCHEMA);
    // These columns were added after groups shipped; guard each ALTER so an existing DO
    // (already carrying rows from before this change) doesn't throw on re-init.
    ctx.blockConcurrencyWhile(async () => {
      try { ctx.storage.sql.exec("ALTER TABLE groups ADD COLUMN lang TEXT NOT NULL DEFAULT 'en'"); } catch { /* already present */ }
      try { ctx.storage.sql.exec("ALTER TABLE groups ADD COLUMN currency TEXT NOT NULL DEFAULT ''"); } catch { /* already present */ }
      try { ctx.storage.sql.exec("ALTER TABLE groups ADD COLUMN weekly_sent INTEGER NOT NULL DEFAULT 0"); } catch { /* already present */ }
      try { ctx.storage.sql.exec("ALTER TABLE groups ADD COLUMN nudged_at INTEGER NOT NULL DEFAULT 0"); } catch { /* already present */ }
    });
  }

  async touchGroup(chatId: number, title: string, handle: string, userId: number, lang = "en"): Promise<{ pro: number; tip_shown: number; currency: string }> {
    // lang is set once, at group creation, and never overwritten by a later speaker's
    // language_code — otherwise one message from a different-language member would flip
    // the whole group's Sunday summary and /nudge DMs (F21).
    this.run("INSERT INTO groups (chat_id, title, lang, created) VALUES (?1, ?2, ?4, ?3) ON CONFLICT(chat_id) DO UPDATE SET title = CASE WHEN ?2 = '' THEN title ELSE ?2 END", chatId, title, now(), lang);
    this.run("INSERT INTO members (chat_id, handle, user_id, last_seen) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(chat_id, handle) DO UPDATE SET user_id = ?3, last_seen = ?4", chatId, handle, userId, now());
    return this.one<{ pro: number; tip_shown: number; currency: string }>("SELECT pro, tip_shown, currency FROM groups WHERE chat_id = ?1", chatId) ?? { pro: 0, tip_shown: 0, currency: "" };
  }
  /** Read-only group lookup (no upsert) for handlers that only need currency/lang/rate-limit
   * state, e.g. /settle, /currency, /nudge, and the weekly cron. */
  async group(chatId: number): Promise<GroupRow | null> {
    return this.one<GroupRow>("SELECT chat_id, title, pro, lang, currency, weekly_sent, nudged_at FROM groups WHERE chat_id = ?1", chatId);
  }
  async setCurrency(chatId: number, currency: string): Promise<void> { this.run("UPDATE groups SET currency = ?2 WHERE chat_id = ?1", chatId, currency); }
  async setNudged(chatId: number, ts: number): Promise<void> { this.run("UPDATE groups SET nudged_at = ?2 WHERE chat_id = ?1", chatId, ts); }
  async markWeeklySent(chatId: number, ts: number): Promise<void> { this.run("UPDATE groups SET weekly_sent = ?2 WHERE chat_id = ?1", chatId, ts); }
  /** Groups with >=1 expense since `since` that haven't had a weekly summary posted since
   * `since` yet (guards against a re-run of the same cron tick double-posting). Bounded to
   * 500 groups per call — the scheduled handler processes at most one page per trigger. */
  async dueForWeeklySummary(since: number): Promise<{ chat_id: number; lang: string; currency: string }[]> {
    return this.all<{ chat_id: number; lang: string; currency: string }>(
      `SELECT g.chat_id, g.lang, g.currency FROM groups g WHERE g.weekly_sent < ?1 AND g.chat_id != -1001234567890
       AND EXISTS (SELECT 1 FROM expenses e WHERE e.chat_id = g.chat_id AND e.deleted = 0 AND e.created >= ?1)
       ORDER BY g.chat_id LIMIT 500`, since);
  }
  /** Members with a known Telegram user id (i.e. seen directly, not just @mentioned), for
   * DMing — a synthetic "idNNNN" handle from a mention has no user_id to DM. */
  async membersDetailed(chatId: number): Promise<{ handle: string; user_id: number | null }[]> {
    return this.all<{ handle: string; user_id: number | null }>("SELECT handle, user_id FROM members WHERE chat_id = ?1 LIMIT 200", chatId);
  }
  /** Marks the group-invite tip as shown; call only after `shouldShowGroupTip` says to show it. */
  async markTipShown(chatId: number): Promise<void> { this.run("UPDATE groups SET tip_shown = 1 WHERE chat_id = ?1", chatId); }
  async members(chatId: number): Promise<string[]> {
    return this.all<{ handle: string }>("SELECT handle FROM members WHERE chat_id = ?1 ORDER BY handle LIMIT 200", chatId).map((r) => r.handle);
  }
  async setGroupPro(chatId: number, charge: string): Promise<void> { this.run("UPDATE groups SET pro = 1, paid_charge = ?2 WHERE chat_id = ?1", chatId, charge); }
  async countExpenses(chatId: number): Promise<number> {
    return (this.one<{ n: number }>("SELECT COUNT(*) AS n FROM expenses WHERE chat_id = ?1 AND deleted = 0", chatId) ?? { n: 0 }).n;
  }
  async addExpense(chatId: number, payer: string, cents: number, desc: string, participants: string[]): Promise<number> {
    this.run("INSERT INTO expenses (chat_id, payer, cents, desc, participants, created) VALUES (?1, ?2, ?3, ?4, ?5, ?6)", chatId, payer, cents, desc, JSON.stringify(participants), now());
    return this.lastId();
  }
  async expenses(chatId: number): Promise<Expense[]> {
    return this.all<ExpenseRow>("SELECT * FROM expenses WHERE chat_id = ?1 AND deleted = 0 ORDER BY created LIMIT 5000", chatId)
      .map((r) => ({ payer: r.payer, cents: r.cents, participants: JSON.parse(r.participants) as string[] }));
  }
  async rows(chatId: number): Promise<ExpenseRow[]> {
    return this.all<ExpenseRow>("SELECT * FROM expenses WHERE chat_id = ?1 AND deleted = 0 ORDER BY created LIMIT 5000", chatId);
  }
  async undo(chatId: number): Promise<ExpenseRow | null> {
    const r = this.one<ExpenseRow>("SELECT * FROM expenses WHERE chat_id = ?1 AND deleted = 0 ORDER BY id DESC LIMIT 1", chatId);
    if (r) this.run("UPDATE expenses SET deleted = 1 WHERE id = ?1", r.id);
    return r;
  }
  async clear(chatId: number): Promise<number> { return this.run("UPDATE expenses SET deleted = 1 WHERE chat_id = ?1 AND deleted = 0", chatId); }
  /** Keyed on user_id, not handle: usernames are recyclable, so a stranger who later claims a
   * departed member's @handle must not inherit that member's read access to the group. */
  async groupsOf(userId: number): Promise<{ chat_id: number; title: string; pro: number; currency: string }[]> {
    return this.all("SELECT g.chat_id, g.title, g.pro, g.currency FROM groups g JOIN members m ON m.chat_id = g.chat_id WHERE m.user_id = ?1 ORDER BY g.created DESC LIMIT 20", userId);
  }
  /** First-touch attribution for a deep-link source payload (e.g. ?start=site). */
  async addSource(userId: number, src: string): Promise<void> {
    this.run("INSERT OR IGNORE INTO sources (user_id, src, ts) VALUES (?1, ?2, ?3)", userId, src, now());
  }
  async stats(): Promise<FleetStats> {
    const g = this.one<{ n: number; p: number | null }>("SELECT COUNT(*) AS n, SUM(pro) AS p FROM groups WHERE chat_id != -1001234567890");
    const e = this.one<{ n: number; v: number | null }>("SELECT COUNT(*) AS n, SUM(cents) AS v FROM expenses WHERE deleted = 0 AND chat_id != -1001234567890");
    const u = this.userStats();
    const qg = this.one<{ n: number }>("SELECT COUNT(*) AS n FROM groups WHERE pro = 1 AND chat_id = -1001234567890");
    const sr = this.all<{ src: string; n: number }>("SELECT src, COUNT(*) AS n FROM sources WHERE NOT (user_id BETWEEN 900000000 AND 900999999) GROUP BY src");
    const s: Record<string, number> = {};
    for (const r of sr) s["src_" + r.src] = r.n;
    return { ...u, ...s, qa_pro: u.qa_pro + (qg?.n ?? 0), pro: (g?.p ?? 0) + u.pro, events: e?.n ?? 0, groups: g?.n ?? 0, volume_cents: e?.v ?? 0 };
  }
}
