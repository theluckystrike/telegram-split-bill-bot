import { Bot, Context, InlineKeyboard, InputFile } from "grammy";
import { Env as KitEnv, PRO_STARS, ProSpec, displayName, isPrivate, makeFetch, now, preparedShare, sendInvoice, wirePro } from "./kit.ts";
import { GuestReply, queryText, wireGuest, wireInline } from "./guest.ts";
import { Store } from "./db.ts";
import { APP_HTML, buildShareText, validateInitData } from "./webapp.ts";
import { balances, buildGuestReply, canNudge, isRealSender, isSourcePayload, money, nextWeeklySentMark, parseAdd, parseCurrency, personalSummary, settle, showHandle, shouldShowGroupTip, topPayers, truncateForUrl, weeklyTotals } from "./parse.ts";
import { resolveLang, t } from "./i18n.ts";
export { Store };

const MORE_TEXT = "More free tools by the same maker:\n🔒 @WhisperLockBot — locked messages only one person can open\n⏰ @NudgeRemindBot — reminders that arrive on time\n📮 @AnonInboxProBot — anonymous inbox via your link\n🧾 @SplitTabsBot — split group expenses\n🔥 @HabitStreakProBot — habit streaks with daily check-ins";
const BOT = "SplitTabsBot";
const FREE_EXPENSES = 20;
interface Env extends KitEnv { STORE: DurableObjectNamespace<Store>; }
const store = (env: Env) => env.STORE.get(env.STORE.idFromName("main"));
const SHARE_TEXT = "Split group expenses without the spreadsheet, right inside Telegram.";
const shareUrl = () => `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${BOT}?start=share`)}&text=${encodeURIComponent(SHARE_TEXT)}`;

const PRO: ProSpec = {
  title: "SplitTabs Pro (this group)",
  description: "Unlimited expenses and CSV export for one group. One-time payment, no subscription.",
  payload: "split-pro",
  thanks: "✅ Pro unlocked for the group. Unlimited expenses and /export.\n\n/more — more free tools",
};
const helpText = (lang: string): string => t(lang, "help", { free: FREE_EXPENSES, stars: PRO_STARS });
const startText = (lang: string): string => t(lang, "start", { free: FREE_EXPENSES, stars: PRO_STARS });

const handleOf = (from: { id: number; username?: string }): string => from.username?.toLowerCase() ?? `id${from.id}`;

async function onAdd(ctx: Context, env: Env): Promise<void> {
  if (isPrivate(ctx)) {
    const lang = resolveLang(ctx.from?.language_code);
    await ctx.reply(t(lang, "addPrivateNudge") + "\n\n" + helpText(lang), { parse_mode: "Markdown" });
    return;
  }
  const from = ctx.from, chat = ctx.chat;
  if (!from || !chat) return;
  const p = parseAdd(String(ctx.match ?? ""));
  if (!p) { await ctx.reply("Usage: /add 20 dinner @anna @ben"); return; }
  const me = handleOf(from);
  const g = await store(env).touchGroup(chat.id, "title" in chat ? chat.title ?? "" : "", me, from.id, resolveLang(from.language_code));
  const priorCount = await store(env).countExpenses(chat.id);
  if (!g.pro && priorCount >= FREE_EXPENSES) {
    await store(env).track(from.id, "pro_prompt");
    const lang = resolveLang(from.language_code);
    await ctx.reply(t(lang, "limitReached", { free: FREE_EXPENSES, stars: PRO_STARS }), { reply_markup: proKb(chat.id, lang) });
    return;
  }
  const parts = p.mentions.length ? Array.from(new Set([...p.mentions, me])) : await store(env).members(chat.id);
  await store(env).track(from.id, "action");
  const id = await store(env).addExpense(chat.id, me, p.cents, p.desc, parts);
  await ctx.reply(`✅ #${id} ${showHandle(me)} paid ${money(p.cents, g.currency)} for ${p.desc}\nsplit ${parts.length} ways: ${parts.map(showHandle).join(", ")}`);
  if (shouldShowGroupTip(priorCount, g.tip_shown)) {
    await store(env).markTipShown(chat.id);
    await ctx.reply(`Add me to your next trip group too: t.me/${BOT}?startgroup=true`);
  }
}

async function onBalance(ctx: Context, env: Env): Promise<void> {
  if (isPrivate(ctx)) { await ctx.reply(helpText(resolveLang(ctx.from?.language_code)), { parse_mode: "Markdown" }); return; }
  const from = ctx.from, chat = ctx.chat;
  if (!from || !chat) return;
  const g = await store(env).touchGroup(chat.id, "", handleOf(from), from.id, resolveLang(from.language_code));
  const b = balances(await store(env).expenses(chat.id));
  const lines = Object.entries(b).sort((x, y) => y[1] - x[1]).map(([h, v]) => `${showHandle(h)}: ${v >= 0 ? "+" : ""}${money(v, g.currency)}`);
  if (!lines.length) { await ctx.reply("No expenses yet. /add 20 dinner @anna"); return; }
  const text = "💰 Balances (+ is owed, − owes)\n" + lines.join("\n");
  const kb = Object.keys(b).length >= 2 ? myKb("b", chat.id) : undefined;
  await ctx.reply(text, kb ? { reply_markup: kb } : undefined);
}

async function onSettle(ctx: Context, env: Env): Promise<void> {
  if (isPrivate(ctx)) { await ctx.reply(helpText(resolveLang(ctx.from?.language_code)), { parse_mode: "Markdown" }); return; }
  if (!ctx.chat) return;
  const currency = (await store(env).group(ctx.chat.id))?.currency ?? "";
  const t = settle(balances(await store(env).expenses(ctx.chat.id)));
  const text = t.length ? "🤝 Settle up\n" + t.map((x) => `${showHandle(x.from)} → ${showHandle(x.to)}: ${money(x.cents, currency)}`).join("\n") : "All square.";
  await ctx.reply(text, t.length ? { reply_markup: myKb("s", ctx.chat.id) } : undefined);
}

async function onExport(ctx: Context, env: Env): Promise<void> {
  if (isPrivate(ctx)) { await ctx.reply(helpText(resolveLang(ctx.from?.language_code)), { parse_mode: "Markdown" }); return; }
  const from = ctx.from, chat = ctx.chat;
  if (!from || !chat) return;
  const g = await store(env).touchGroup(chat.id, "", handleOf(from), from.id, resolveLang(from.language_code));
  if (!g.pro) { await ctx.reply(t(resolveLang(from.language_code), "exportProOnly"), { reply_markup: proKb(chat.id, resolveLang(from.language_code)) }); return; }
  const rows = await store(env).rows(chat.id);
  const csv = "id,date,payer,amount,description,participants\n" + rows.map((r) =>
    `${r.id},${new Date(r.created * 1000).toISOString().slice(0, 10)},${r.payer},${money(r.cents, g.currency)},"${r.desc.replaceAll('"', "'")}","${(JSON.parse(r.participants) as string[]).join(" ")}"`).join("\n");
  await ctx.replyWithDocument(new InputFile(new TextEncoder().encode(csv), "splittabs.csv"));
}

async function onCurrency(ctx: Context, env: Env): Promise<void> {
  if (isPrivate(ctx)) return;
  const chat = ctx.chat;
  if (!chat) return;
  const arg = String(ctx.match ?? "").trim();
  if (!arg) {
    const g = await store(env).group(chat.id);
    await ctx.reply(g?.currency ? `Currency for this group: ${g.currency}` : "No currency set. Usage: /currency EUR");
    return;
  }
  const c = parseCurrency(arg);
  if (!c) { await ctx.reply("Usage: /currency EUR  (1-8 chars, no spaces)"); return; }
  await store(env).setCurrency(chat.id, c);
  await ctx.reply(`Currency for this group set to ${c}.`);
}

const WEEK = 7 * 24 * 60 * 60;

/** DMs each member with a negative balance their personal line (reusing the same
 * "My summary" content shown by /balance's callback), skipping anyone who never started
 * the bot. Rate-limited per group via canNudge/group.nudged_at. */
async function onNudge(ctx: Context, env: Env): Promise<void> {
  if (isPrivate(ctx)) return;
  const chat = ctx.chat;
  if (!chat) return;
  const g = await store(env).group(chat.id);
  const lang = g?.lang ?? "en";
  if (!canNudge(g?.nudged_at, now())) { await ctx.reply(t(lang, "nudgeCooldown")); return; }
  const [ex, members] = await Promise.all([store(env).expenses(chat.id), store(env).membersDetailed(chat.id)]);
  const b = balances(ex);
  const s = settle(b);
  const idByHandle = new Map(members.filter((mm) => mm.user_id != null).map((mm) => [mm.handle, mm.user_id as number]));
  let n = 0;
  // Capped at 50 sequential DMs per run — membersDetailed can return up to 200 rows, and a
  // full 200-send loop risks the 25s webhook budget. Setting the cooldown after the loop
  // (not before) means a run that times out mid-way doesn't burn the whole 24h window.
  for (const [handle, v] of Object.entries(b).slice(0, 50)) {
    if (v >= 0) continue;
    const uid = idByHandle.get(handle);
    if (!uid) continue;
    const text = t(lang, "nudgeLine") + "\n\n" + personalSummary(b, s, handle, g?.currency);
    try { await ctx.api.sendMessage(uid, text); n += 1; } catch { /* never started the bot */ }
  }
  await store(env).setNudged(chat.id, now());
  await ctx.reply(t(lang, "nudgeReplyCount", { n }));
}

/** This group's plain-text weekly summary: total spent and expense count over the last 7
 * days (`weeklyTotals`), the top 3 payers over that same window (`topPayers`), and the
 * current minimal settlement across the group's whole history (`settle`, same as /settle). */
async function weeklySummaryFor(env: Env, chatId: number, lang: string, currency: string, since: number): Promise<string> {
  const [rows, ex] = await Promise.all([store(env).rows(chatId), store(env).expenses(chatId)]);
  const wt = weeklyTotals(rows, since);
  const top = topPayers(rows.filter((r) => r.created >= since), 3);
  const s = settle(balances(ex));
  const lines = [
    t(lang, "weeklySummaryTitle"),
    `Total this week: ${money(wt.totalCents, currency)} across ${wt.count} expense${wt.count === 1 ? "" : "s"}`,
    top.length ? "Top payers: " + top.map((p) => `${showHandle(p.payer)} ${money(p.cents, currency)}`).join(", ") : "No payers this week.",
    s.length ? "Settle up:\n" + s.map((x) => `${showHandle(x.from)} → ${showHandle(x.to)}: ${money(x.cents, currency)}`).join("\n") : "All square.",
  ];
  return lines.join("\n\n");
}

/** Posts a weekly summary to every group with >=1 expense in the last 7 days that hasn't
 * had one posted yet this week, bounded to 500 groups per run (matches habit's `prompt()`
 * cron pattern: always mark as sent, even if the send itself failed, so a broken group
 * can't wedge the whole run in a retry loop). */
async function weeklySummary(env: Env): Promise<number> {
  const bot = new Bot(env.BOT_TOKEN);
  const since = now() - WEEK;
  const due = await store(env).dueForWeeklySummary(since);
  let sent = 0;
  for (const g of due.slice(0, 500)) {
    try {
      const text = await weeklySummaryFor(env, g.chat_id, g.lang, g.currency, since);
      await bot.api.sendMessage(g.chat_id, text, { reply_markup: myKb("b", g.chat_id) });
      sent += 1;
    } catch (e) { console.log("weekly summary failed", g.chat_id, String(e).slice(0, 100)); }
    // Mark with this run's own window, not the wall clock at send time (see
    // nextWeeklySentMark in parse.ts) — otherwise send latency can push the marker past the
    // next trigger's `since` and the group gets silently skipped for a whole week.
    await store(env).markWeeklySent(g.chat_id, nextWeeklySentMark(since));
  }
  return sent;
}

/** Static copy for a guest chat, with the Markdown the i18n table carries stripped: guest
 * results are posted as plain text (the query is user-supplied and may contain _ or *). */
const plain = (s: string): string => s.replaceAll("*", "").replaceAll("`", "");

/** Guest Mode: someone @-mentioned us in a chat we were never added to. The math itself
 * (parses -> value card, garbage -> pitch) lives in the pure, unit-tested
 * `buildGuestReply` in parse.ts; this just gathers the caller's identity and language. */
async function onGuest(ctx: Context, env: Env): Promise<GuestReply> {
  const from = ctx.from;
  const lang = resolveLang(from?.language_code);
  const q = queryText(ctx, BOT);
  const me = from ? handleOf(from) : "you";
  const pitch: GuestReply = { title: "🧾 SplitTabs — split group expenses", description: "Try: @" + BOT + " 120 pizza @a @b @c", text: plain(startText(lang)) };
  return buildGuestReply(q, me, pitch);
}

const proKb = (chatId: number, lang: string): InlineKeyboard => new InlineKeyboard().url(t(lang, "btn_unlockProStars", { stars: PRO_STARS }), `https://t.me/${BOT}?start=pro_${String(chatId).replace("-", "m")}`);
// The balance/settle text names every member — it must never leave the group as-is. "My
// summary" is a callback (inline buttons are shared by everyone who sees the message) that
// looks up the tapping user and DMs back only their own line + the transfers touching them.
const myKb = (kind: "b" | "s", chatId: number): InlineKeyboard => new InlineKeyboard().text("📤 My summary", `sum:${kind}:${chatId}`);
// SplitTabs has no inline mode, so sharing from the DM is a t.me/share/url link the user opens
// to pick another chat; only their already-personal text rides along as the prefilled message.
const shareTextUrl = (text: string): string => `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${BOT}?start=share`)}&text=${encodeURIComponent(truncateForUrl(text))}`;

function buildBot(env: Env): Bot {
  const bot = new Bot(env.BOT_TOKEN);
  // Real-sender guard: only real messages (never channel posts), never the anonymous-admin
  // pseudo-user, never a message relayed via another bot's inline result.
  const m = bot.on("message").filter((ctx) => isRealSender(ctx.from.id, ctx.message.via_bot, ctx.message.sender_chat));
  m.command("more", (ctx) => ctx.reply(MORE_TEXT));
  m.command("start", async (ctx) => {
    const from = ctx.from;
    const u = await store(env).touchUser(from.id, from.username, displayName(from));
    await store(env).track(from.id, "start");
    const lang = resolveLang(from.language_code);
    const payload = String(ctx.match ?? "");
    const pm = payload.match(/^pro_(m?\d+)$/);
    if (pm) {
      const spec: ProSpec = { ...PRO, description: t(lang, "proDescription") };
      await sendInvoice(ctx, spec, "split-pro:" + pm[1].replace("m", "-"));
      return;
    }
    // Only a genuinely new user counts as an acquisition; a returning user tapping a share
    // link again must not inflate src_* counts (sources is first-touch anyway, but gating
    // here keeps addSource calls, and the acquisition semantics, honest).
    if (isSourcePayload(payload) && u.isNew) await store(env).addSource(from.id, payload);
    const kb = new InlineKeyboard().url(t(lang, "btn_addToGroup"), `https://t.me/${BOT}?startgroup=true`).row().url(t(lang, "btn_shareBot"), shareUrl());
    await ctx.reply(startText(lang), { parse_mode: "Markdown", reply_markup: kb });
  });
  m.command("help", (ctx) => ctx.reply(helpText(resolveLang(ctx.from.language_code)), { parse_mode: "Markdown" }));
  m.command("add", (ctx) => onAdd(ctx, env));
  m.command("balance", (ctx) => onBalance(ctx, env));
  m.command("settle", (ctx) => onSettle(ctx, env));
  m.command("export", (ctx) => onExport(ctx, env));
  m.command("undo", async (ctx) => {
    if (isPrivate(ctx)) return;
    const [r, g] = await Promise.all([store(env).undo(ctx.chat.id), store(env).group(ctx.chat.id)]);
    await ctx.reply(r ? `🗑 removed #${r.id} ${money(r.cents, g?.currency)} ${r.desc}` : "Nothing to undo.");
  });
  m.command("clear", async (ctx) => { if (isPrivate(ctx)) return; const n = await store(env).clear(ctx.chat.id); await ctx.reply(`🧹 cleared ${n} expenses.`); });
  m.command("currency", (ctx) => onCurrency(ctx, env));
  m.command("nudge", (ctx) => onNudge(ctx, env));
  m.command("pro", async (ctx) => {
    const lang = resolveLang(ctx.from.language_code);
    if (isPrivate(ctx)) { await ctx.reply(t(lang, "proRunInGroup")); return; }
    await ctx.reply(t(lang, "proGroupInfo", { stars: PRO_STARS }), { reply_markup: proKb(ctx.chat.id, lang) });
  });
  // "My summary": private per-user reply to the shared "📤 My summary" button on a group's
  // /balance or /settle message. Never touches the group chat — only DMs the tapping user.
  bot.callbackQuery(/^sum:(b|s):(-?\d+)$/, async (ctx) => {
    const from = ctx.from;
    if (!isRealSender(from.id, undefined)) { await ctx.answerCallbackQuery({ text: "Can't identify you as the group's anonymous admin.", show_alert: true }); return; }
    const parts = ctx.callbackQuery.data.match(/^sum:(b|s):(-?\d+)$/);
    if (!parts) return;
    const chatId = Number(parts[2]);
    const handle = handleOf(from);
    const [ex, g] = await Promise.all([store(env).expenses(chatId), store(env).group(chatId)]);
    const b = balances(ex);
    const s = settle(b);
    const text = personalSummary(b, s, handle, g?.currency);
    const kb = new InlineKeyboard().url("📤 Share my line", shareTextUrl(text));
    try {
      await ctx.api.sendMessage(from.id, text, { reply_markup: kb });
      await ctx.answerCallbackQuery({ text: "Sent to your DM 📩" });
    } catch {
      await ctx.answerCallbackQuery({ text: `Start @${BOT} first, then tap again.`, show_alert: true });
    }
  });
  // wirePro (shared kit.ts) registers its own /pro on the base bot; the override above shadows it in groups.
  // kit.ts always sends its own (English) spec.thanks after onPaid resolves; for a non-English
  // payer we send a localized thank-you first so they get at least one message in their language.
  wirePro(bot, PRO, async (ctx, payload, charge) => {
    await store(env).track(ctx.from!.id, "paid");
    const pm = payload.match(/^split-pro:(-?\d+)$/);
    if (pm) await store(env).setGroupPro(Number(pm[1]), charge); else await store(env).setPro(ctx.from!.id, charge);
    const lang = resolveLang(ctx.from?.language_code);
    if (lang !== "en") await ctx.reply(t(lang, "thankYou"));
  });
  wireGuest(bot, {
    botUsername: BOT,
    reply: (ctx) => onGuest(ctx, env),
    // `guest` is NOT written to `sources` here (REVIEW-GUEST F3): a summoner is not an
    // installer. src_guest is earned later, through the ?start=guest deep link in the
    // buttons below. recordGuest self-limits; `flood` downgrades us to the cheap pitch.
    record: async (uid, chatType, chatId) => {
      const r = await store(env).recordGuest(uid, chatType, chatId);
      if (r.recorded) await store(env).track(uid, "guest");
      return !r.flood;
    },
  });
  // Classic inline mode: the SAME reply builder, answered as an inline result. A user types
  // "@Bot query" in any chat on any client and posts the card with `via @Bot` attribution —
  // no admin, no membership, no Guest Chat Mode toggle. The destination chat is unknown, so
  // the card carries private-style buttons only. Counted under `inline_queries`; `sources` is
  // never written here (an inline user is not an installer, same rule as the guest path).
  wireInline(bot, {
    botUsername: BOT,
    reply: (ctx) => onGuest(ctx, env),
    record: async (uid) => !(await store(env).recordInline(uid)).flood,
    chosen: (uid) => store(env).recordInlineChosen(uid),
  });
  bot.on("message:new_chat_members", (ctx) => {
    if (!ctx.message.new_chat_members.some((mem) => mem.id === ctx.me.id)) return;
    return ctx.reply(helpText(resolveLang(ctx.from?.language_code)), { parse_mode: "Markdown" });
  });
  bot.on("message:text", async (ctx) => {
    if (!isRealSender(ctx.from.id, ctx.message.via_bot, ctx.message.sender_chat)) return;
    if (!isPrivate(ctx)) { await store(env).touchGroup(ctx.chat.id, ctx.chat.title ?? "", handleOf(ctx.from), ctx.from.id, resolveLang(ctx.from.language_code)); return; }
    await ctx.reply(helpText(resolveLang(ctx.from.language_code)), { parse_mode: "Markdown" });
  });
  return bot;
}

async function api(req: Request, env: Env): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { initData?: string };
  const user = await validateInitData(body.initData ?? "", [env.BOT_TOKEN, env.HUB_BOT_TOKEN].filter((t): t is string => !!t));
  if (!user) return Response.json({ error: "Open this page from Telegram." }, { status: 401 });
  const groups = [];
  for (const g of (await store(env).groupsOf(user.id)).slice(0, 20)) {
    const ex = await store(env).expenses(g.chat_id);
    const b = balances(ex);
    groups.push({ title: g.title, pro: g.pro, count: ex.length, total: money(ex.reduce((s, e) => s + e.cents, 0), g.currency),
      balances: Object.entries(b).sort((x, y) => y[1] - x[1]).map(([h, v]) => ({ who: showHandle(h), amount: v / 100 })),
      settle: settle(b).map((t) => ({ from: showHandle(t.from), to: showHandle(t.to), amount: t.cents / 100 })) });
  }
  return Response.json({ groups });
}
/** POST /api/share: registers a Bot API "prepared" inline message (savePreparedInlineMessage)
 * so the Mini App can hand its id to tg.shareMessage(id) for a native chat/group/channel share. */
async function apiShare(req: Request, env: Env): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { initData?: string };
  const user = await validateInitData(body.initData ?? "", [env.BOT_TOKEN, env.HUB_BOT_TOKEN].filter((t): t is string => !!t));
  if (!user) return Response.json({ error: "Open this page from Telegram." }, { status: 401 });
  try {
    const share = await preparedShare(env, user.id, buildShareText(SHARE_TEXT, BOT, "shared"), `https://t.me/${BOT}`);
    await store(env).recordShare(user.id, "chat");
    return Response.json(share);
  } catch { return Response.json({ error: "Share unavailable." }, { status: 502 }); }
}

/** POST /api/share-story: records a "share to story" click. Telegram gives no server
 * callback for tg.shareToStory, so the client fires this right before calling it. */
async function apiShareStory(req: Request, env: Env): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { initData?: string };
  const user = await validateInitData(body.initData ?? "", [env.BOT_TOKEN, env.HUB_BOT_TOKEN].filter((t): t is string => !!t));
  if (!user) return Response.json({ error: "Open this page from Telegram." }, { status: 401 });
  await store(env).recordShare(user.id, "story");
  return Response.json({ ok: true });
}

const botFetch = makeFetch<Env>(buildBot, (env) => store(env).stats());
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const path = new URL(req.url).pathname;
    if (path === "/app") return new Response(APP_HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
    if (path === "/api/share" && req.method === "POST") return apiShare(req, env);
    if (path === "/api/share-story" && req.method === "POST") return apiShareStory(req, env);
    if (path === "/api/groups" && req.method === "POST") return api(req, env);
    return botFetch(req, env);
  },
  async scheduled(_ev: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> { ctx.waitUntil(weeklySummary(env)); },
};
