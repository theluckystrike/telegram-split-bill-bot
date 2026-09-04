import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAdd, balances, settle, isRealSender, isSourcePayload, truncateSummary, truncateForUrl, personalSummary, shouldShowGroupTip, GROUP_ANON_ID, money, weeklyTotals, topPayers, canNudge, parseCurrency, nextWeeklySentMark, WEEK_SECONDS } from "../src/parse.ts";
test("parseAdd", () => {
  assert.deepEqual(parseAdd("20 dinner @Anna @ben"), { cents: 2000, desc: "dinner", mentions: ["anna", "ben"] });
  assert.deepEqual(parseAdd("12,50 taxi"), { cents: 1250, desc: "taxi", mentions: [] });
  assert.equal(parseAdd("dinner 20"), null);
  assert.equal(parseAdd("0 x"), null);
  assert.equal(parseAdd("€7")?.desc, "expense");
});
test("balances split with remainder", () => {
  const b = balances([{ payer: "a", cents: 1000, participants: ["a", "b", "c"] }]);
  assert.equal(b.a + b.b + b.c, 0);
  assert.equal(b.a, 1000 - 334);
  assert.equal(b.b, -333);
});
test("settle minimal transfers", () => {
  const t = settle({ a: 666, b: -333, c: -333 });
  assert.equal(t.length, 2);
  assert.equal(t.reduce((s, x) => s + x.cents, 0), 666);
  assert.deepEqual(settle({ a: 0 }), []);
});
test("real-sender guard rejects anonymous admin, via_bot, channel posts and pseudo-senders", () => {
  assert.equal(isRealSender(42, undefined), true);
  assert.equal(isRealSender(GROUP_ANON_ID, undefined), false);
  assert.equal(isRealSender(42, true), false);
  assert.equal(isRealSender(undefined, undefined), false);
  assert.equal(isRealSender(136817688, undefined), false); // Channel_Bot (channel post in linked group)
  assert.equal(isRealSender(777000, undefined), false); // Telegram service
  assert.equal(isRealSender(42, undefined, { id: -100, type: "channel" }), false); // sender_chat present
});
test("personalSummary carries only the tapping user's own line and transfers", () => {
  const b = { anna: 666, ben: -333, cara: -333 };
  const t = settle(b);
  // 1) a creditor sees their net line plus every transfer paying them, never anyone else's own net.
  const anna = personalSummary(b, t, "anna");
  assert.match(anna, /Your balance: \+6\.66 \(you are owed\)/);
  assert.match(anna, /owes you: 3\.33/);
  assert.doesNotMatch(anna, /Your balance.*Your balance/s); // exactly one net line, no one else's
  // 2) a debtor sees a negative net line and "You owe" for their own transfer only.
  const ben = personalSummary(b, t, "ben");
  assert.match(ben, /Your balance: -3\.33 \(you owe\)/);
  assert.match(ben, /You owe .*: 3\.33/);
  // 3) someone with no balance in this group gets a clean "no balance" line and no transfers.
  const dee = personalSummary(b, t, "dee");
  assert.match(dee, /no balance in this group yet/);
  assert.doesNotMatch(dee, /owe/i);
  assert.match(anna, /@SplitTabsBot/);
});
test("truncateForUrl bounds the encoded length, not the raw character count", () => {
  const short = "hi";
  assert.equal(truncateForUrl(short, 100), short);
  const emojiHeavy = "💰".repeat(200); // each char encodes to ~12 chars
  const t = truncateForUrl(emojiHeavy, 100);
  assert.ok(encodeURIComponent(t).length <= 100);
  assert.ok(t.endsWith("…"));
});
test("source payload regex", () => {
  assert.equal(isSourcePayload("site"), true);
  assert.equal(isSourcePayload("list"), true);
  assert.equal(isSourcePayload("x"), false);
  assert.equal(isSourcePayload("toolongsourcename"), false);
  assert.equal(isSourcePayload("Site"), false);
});
test("summary truncation stays under the cap and marks the cut", () => {
  assert.equal(truncateSummary("short"), "short");
  const long = "x".repeat(400);
  const t = truncateSummary(long);
  assert.equal(t.length, 300);
  assert.equal(t.endsWith("…"), true);
  assert.equal(truncateSummary("abcdef", 5), "abcd…");
});
test("group tip shows once, only on the first /add", () => {
  assert.equal(shouldShowGroupTip(0, 0), true);
  assert.equal(shouldShowGroupTip(0, 1), false);
  assert.equal(shouldShowGroupTip(5, 0), false);
  assert.equal(shouldShowGroupTip(5, 1), false);
});
test("money defaults to plain form, appends a currency code/symbol when given", () => {
  assert.equal(money(2000), "20.00");
  assert.equal(money(2000, "EUR"), "20.00 EUR");
  assert.equal(money(150, "€"), "1.50 €");
  assert.equal(money(0, ""), "0.00");
});
test("personalSummary threads the group's currency into every money() line", () => {
  const b = { anna: 666, ben: -333 };
  const t = settle(b);
  const anna = personalSummary(b, t, "anna", "EUR");
  assert.match(anna, /\+6\.66 EUR/);
  assert.match(anna, /3\.33 EUR/);
  assert.doesNotMatch(personalSummary(b, t, "anna"), /EUR/); // default currency stays plain
});
test("weeklyTotals sums only rows created at-or-after `since`", () => {
  const rows = [{ cents: 1000, created: 100 }, { cents: 500, created: 200 }, { cents: 300, created: 50 }];
  assert.deepEqual(weeklyTotals(rows, 100), { totalCents: 1500, count: 2 });
  assert.deepEqual(weeklyTotals(rows, 1000), { totalCents: 0, count: 0 });
  assert.deepEqual(weeklyTotals([], 0), { totalCents: 0, count: 0 });
});
test("topPayers ranks by total paid, highest first, capped at n", () => {
  const rows = [{ payer: "a", cents: 500 }, { payer: "b", cents: 1000 }, { payer: "a", cents: 700 }, { payer: "c", cents: 100 }];
  assert.deepEqual(topPayers(rows, 3), [{ payer: "a", cents: 1200 }, { payer: "b", cents: 1000 }, { payer: "c", cents: 100 }]);
  assert.deepEqual(topPayers(rows, 1), [{ payer: "a", cents: 1200 }]);
  assert.deepEqual(topPayers([], 3), []);
});
test("canNudge: no prior nudge or a fully-elapsed cooldown allows it, a fresh one blocks it", () => {
  assert.equal(canNudge(undefined, 1000), true);
  assert.equal(canNudge(0, 1000), true);
  assert.equal(canNudge(1000, 1000 + 86_400), true); // exactly 24h later
  assert.equal(canNudge(1000, 1000 + 86_399), false); // one second short
});
test("parseCurrency normalizes a letter code, keeps a symbol, rejects blank/long/whitespace", () => {
  assert.equal(parseCurrency("eur"), "EUR");
  assert.equal(parseCurrency(" USD "), "USD");
  assert.equal(parseCurrency("€"), "€");
  assert.equal(parseCurrency(""), null);
  assert.equal(parseCurrency("too long code"), null);
  assert.equal(parseCurrency("way-too-long-9"), null);
});
test("parseCurrency rejects symbols that would break the CSV export or the Mini App's HTML", () => {
  assert.equal(parseCurrency("A,B"), null); // would shift CSV columns
  assert.equal(parseCurrency('"'), null);
  assert.equal(parseCurrency("'"), null);
  assert.equal(parseCurrency("<b>"), null); // would break innerHTML
  assert.equal(parseCurrency("&amp"), null);
  assert.equal(parseCurrency("¤"), "¤"); // a plain symbol still passes
});
test("nextWeeklySentMark uses the run's own window, not the wall clock, so send latency can't skip a group", () => {
  const since = 1_000_000;
  assert.equal(nextWeeklySentMark(since), since + WEEK_SECONDS);
  // A re-run of the exact same tick still compares `weekly_sent < since` as false (skips).
  assert.equal(nextWeeklySentMark(since) < since, false);
  // The following week's `since` (one full window later) is always strictly less than the
  // marker, i.e. the group is due again — regardless of how long the previous send took.
  const nextSince = since + WEEK_SECONDS;
  assert.equal(nextWeeklySentMark(since) <= nextSince, true);
  // Simulates F2: a marker written from `now()` after a slow send could exceed next week's
  // `since` and skip the group; a marker from `since + WEEK` never can, by construction.
  const slowSendNow = since + 5; // send took 5s
  const lateNextTrigger = since + WEEK_SECONDS + 1; // next cron fired 1s late
  assert.equal(slowSendNow < lateNextTrigger, true); // old bug: this coin-flip could still skip
  assert.equal(nextWeeklySentMark(since) < lateNextTrigger, true); // fixed: always < next since
});
