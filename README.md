# SplitTabsBot — split bill bot for Telegram

**Try it:** [@SplitTabsBot](https://t.me/SplitTabsBot) · [tg.zovo.one/bots/split/](https://tg.zovo.one/bots/split/)

## What it does

SplitTabsBot keeps a running expense ledger for a Telegram group so nobody has to reconstruct who paid for what. Add expenses as they happen with `/add`, and the bot works out who owes whom with the fewest possible payments via `/settle`. It never moves real money — it only tracks and displays the numbers. Balances, an undo for the last entry, a clear to reset, and a CSV export for Pro groups round it out. Free tier: 20 expenses per group. Pro adds unlimited expenses and CSV export.

## Use it without adding the bot

Type `@SplitTabsBot 120 pizza @alex @sam @jo` in **any** Telegram chat, even one the bot has never been added to. It computes the per-person split and who owes whom on the spot and posts it — nothing is saved to a chat the bot isn't in.

Both **Inline Mode** and **Guest Chat Mode** need to be turned on for the bot in [@BotFather](https://t.me/BotFather) (Bot Settings → Mode Settings) — turn Inline Mode on first, then Guest Chat Mode. Without both, only the classic `@Bot query` inline surface works.

## Self-host

```bash
pnpm i
wrangler secret put BOT_TOKEN
wrangler secret put WEBHOOK_SECRET
wrangler deploy
curl -G "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  --data-urlencode "url=https://<your-worker>.workers.dev/webhook" \
  --data-urlencode "secret_token=$WEBHOOK_SECRET" \
  --data-urlencode 'allowed_updates=["message","callback_query","guest_message","inline_query","chosen_inline_result"]'
```

## Stack

[grammY](https://grammy.dev/) on Cloudflare Workers, state in a Durable Object backed by SQLite, Pro upgrades billed with Telegram Stars.

---
Part of Tiny Telegram Tools — https://tg.zovo.one/
