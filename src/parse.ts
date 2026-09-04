export interface AddCmd { cents: number; desc: string; mentions: string[]; }

/** "20 dinner @a @b" | "12.50 taxi" | "€20 lunch" */
export function parseAdd(text: string): AddCmd | null {
  const m = text.trim().match(/^[$€£]?\s*(\d+(?:[.,]\d{1,2})?)\s*(.*)$/s);
  if (!m) return null;
  const cents = Math.round(Number(m[1].replace(",", ".")) * 100);
  if (!(cents > 0) || cents > 1_000_000_00) return null;
  const words = m[2].trim().split(/\s+/).filter(Boolean);
  const mentions = words.filter((w) => /^@[A-Za-z][A-Za-z0-9_]{1,31}$/.test(w)).map((w) => w.slice(1).toLowerCase());
  const desc = words.filter((w) => !w.startsWith("@")).join(" ").slice(0, 80) || "expense";
  return { cents, desc, mentions };
}

/** `currency`, when given, is appended after the amount (e.g. "20.00 EUR"); default keeps
 * the plain numeric form every existing call site already relies on. */
export const money = (cents: number, currency = ""): string => (cents / 100).toFixed(2) + (currency ? " " + currency : "");

export interface Transfer { from: string; to: string; cents: number; }

/** Greedy settlement: balances map name -> net cents (positive = is owed). Bounded by member count. */
export function settle(balances: Record<string, number>): Transfer[] {
  const debtors = Object.entries(balances).filter(([, v]) => v < 0).map(([k, v]) => ({ k, v: -v })).sort((a, b) => b.v - a.v);
  const creditors = Object.entries(balances).filter(([, v]) => v > 0).map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
  const out: Transfer[] = [];
  let i = 0, j = 0, guard = 0;
  while (i < debtors.length && j < creditors.length && guard++ < 500) {
    const x = Math.min(debtors[i].v, creditors[j].v);
    if (x > 0) out.push({ from: debtors[i].k, to: creditors[j].k, cents: x });
    debtors[i].v -= x; creditors[j].v -= x;
    if (debtors[i].v === 0) i++;
    if (creditors[j].v === 0) j++;
  }
  return out;
}

/** Telegram's pseudo-user id for "sent by a group's anonymous admin". */
export const GROUP_ANON_ID = 1087968824;
/** Other pseudo-senders that must never be treated as a real person: the "sent on behalf of
 * a linked channel" bot, and the Telegram service account. */
export const PSEUDO_SENDER_IDS = new Set([GROUP_ANON_ID, 136817688, 777000]);

/** True for a message worth treating as a real person: not one of the pseudo-user ids above,
 * not relayed via another bot's inline result, and not posted on behalf of a channel
 * (`sender_chat` present, even for an id this set doesn't know about). */
export function isRealSender(fromId: number | undefined, viaBot: unknown, senderChat?: unknown): boolean {
  return fromId !== undefined && !PSEUDO_SENDER_IDS.has(fromId) && !viaBot && !senderChat;
}

/** Deep-link `/start` payloads we attribute as an acquisition source, e.g. "site", "x". */
export const SOURCE_RE = /^[a-z]{2,12}$/;
export const isSourcePayload = (payload: string): boolean => SOURCE_RE.test(payload);

/** Truncate a share-button's prefilled text to Telegram's practical share-link length,
 * keeping whole content where possible and marking the cut with an ellipsis. */
export function truncateSummary(text: string, max = 300): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

/** Show the "add me to your next group" tip exactly once per group: only on the group's
 * very first /add (no expenses yet), and only if the tip hasn't been shown before. */
export function shouldShowGroupTip(priorExpenseCount: number, tipShown: number): boolean {
  return priorExpenseCount === 0 && tipShown === 0;
}

export interface Expense { payer: string; cents: number; participants: string[]; }

export function balances(expenses: Expense[]): Record<string, number> {
  const b: Record<string, number> = {};
  for (const e of expenses.slice(0, 5000)) {
    b[e.payer] = (b[e.payer] ?? 0) + e.cents;
    const n = e.participants.length || 1;
    const share = Math.floor(e.cents / n);
    let rem = e.cents - share * n;
    for (const p of e.participants) { const extra = rem > 0 ? 1 : 0; rem -= extra; b[p] = (b[p] ?? 0) - share - extra; }
  }
  return b;
}

/** Display form of a stored handle: "@name" normally, or a stable pseudonym ("userXXXX")
 * for the synthetic "idNNNN" handle members get when they were mentioned but never seen. */
export const showHandle = (h: string): string => h.startsWith("id") && /^id\d+$/.test(h) ? "user" + h.slice(2, 6) : "@" + h;

const PITCH = "\n\n🧾 Split group expenses without the spreadsheet — @SplitTabsBot";

/** The tapping user's own share of a group summary: their net line plus only the transfers
 * that involve them, never any other member's balance. Pure so it's directly testable. */
export function personalSummary(balances: Record<string, number>, settleList: Transfer[], handle: string, currency = ""): string {
  const net = balances[handle];
  const lines: string[] = [net === undefined
    ? "You have no balance in this group yet."
    : `Your balance: ${net >= 0 ? "+" : ""}${money(net, currency)} (${net >= 0 ? "you are owed" : "you owe"})`];
  for (const x of settleList) {
    if (x.from === handle) lines.push(`You owe ${showHandle(x.to)}: ${money(x.cents, currency)}`);
    else if (x.to === handle) lines.push(`${showHandle(x.from)} owes you: ${money(x.cents, currency)}`);
  }
  return "💰 Your summary\n" + lines.join("\n") + PITCH;
}

/** Truncate `text` so its `encodeURIComponent` length stays under a share-link's practical
 * cap — truncating the raw character count isn't enough since multi-byte emoji/handles can
 * expand 3-6x once percent-encoded. Bounded binary search, never more than ~11 iterations. */
export function truncateForUrl(text: string, maxEncoded = 1500): string {
  if (encodeURIComponent(text).length <= maxEncoded) return text;
  const chars = Array.from(text); // code-point aware: never cut a surrogate pair in half
  let lo = 0, hi = chars.length, guard = 0;
  while (lo < hi && guard++ < 40) {
    const mid = (lo + hi + 1) >> 1;
    if (encodeURIComponent(chars.slice(0, mid).join("") + "…").length <= maxEncoded) lo = mid; else hi = mid - 1;
  }
  return chars.slice(0, lo).join("") + "…";
}

export interface WeeklyTotals { totalCents: number; count: number; }

/** Total spent and expense count among `rows` created at-or-after `since` (unix seconds).
 * Bounded by the caller's row list (already capped at 5000 by the store). */
export function weeklyTotals(rows: { cents: number; created: number }[], since: number): WeeklyTotals {
  let totalCents = 0, count = 0;
  for (const r of rows) if (r.created >= since) { totalCents += r.cents; count += 1; }
  return { totalCents, count };
}

export interface PayerTotal { payer: string; cents: number; }

/** The `n` payers with the highest total paid across `rows`, highest first. Callers pass an
 * already time-windowed row list (e.g. via `weeklyTotals`'s `since` cutoff) when a "this
 * week" ranking is wanted — this helper itself does no date filtering. */
export function topPayers(rows: { payer: string; cents: number }[], n = 3): PayerTotal[] {
  const totals: Record<string, number> = {};
  for (const r of rows) totals[r.payer] = (totals[r.payer] ?? 0) + r.cents;
  return Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, n).map(([payer, cents]) => ({ payer, cents }));
}

/** True when a nudge is allowed: no prior nudge (`lastTs` falsy) or the cooldown has fully
 * elapsed. Both timestamps are unix seconds. */
export function canNudge(lastTs: number | null | undefined, now: number, cooldownSec = 86_400): boolean {
  return !lastTs || now - lastTs >= cooldownSec;
}

/** Validate/normalize a `/currency` argument: 1-8 chars, no whitespace. A pure-letter code
 * (e.g. "eur") is upper-cased ("EUR"); a symbol (e.g. "€") is kept as typed. Returns null for
 * anything else (empty, too long, contains whitespace). */
export const WEEK_SECONDS = 7 * 24 * 60 * 60;

/** The value to persist as a group's `weekly_sent` marker after a cron run whose due-query
 * used `since` as its window start. Marking with the run's own window — instead of the wall
 * clock at send time — is what keeps the next run's `weekly_sent < since` comparison from
 * skipping a group: send latency (two DO reads + sendMessage) can easily push `now()` past
 * the next trigger's `since`, but `since + WEEK_SECONDS` always lands exactly one window
 * ahead, so a re-run of the same tick still correctly skips (idempotent) while every future
 * tick's `since` is guaranteed to be `< since + WEEK_SECONDS` and so counts the group as due
 * again. */
export function nextWeeklySentMark(since: number): number { return since + WEEK_SECONDS; }

export function parseCurrency(text: string): string | null {
  const v = text.trim();
  if (!v || v.length > 8 || /\s/.test(v)) return null;
  if (/^[A-Za-z]+$/.test(v)) return v.toUpperCase();
  // A symbol (e.g. "€") is kept as typed, but excluding comma/quote/angle-bracket/ampersand
  // keeps it safe to drop unquoted into the CSV export and unescaped into the Mini App's HTML.
  return /^[^\s,"'<>&]{1,8}$/.test(v) ? v : null;
}
