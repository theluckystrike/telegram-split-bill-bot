# SplitTabsBot — split bill bot for Telegram

**Try it:** [@SplitTabsBot](https://t.me/SplitTabsBot) · [tg.zovo.one/bots/split/](https://tg.zovo.one/bots/split/)

## What it does

SplitTabsBot keeps a running expense ledger for a Telegram group so nobody has to reconstruct who paid for what. Add expenses as they happen with `/add`, and the bot works out who owes whom with the fewest possible payments via `/settle`. It never moves real money — it only tracks and displays the numbers. Balances, an undo for the last entry, a clear to reset, and a CSV export for Pro groups round it out. Free tier: 20 expenses per group. Pro adds unlimited expenses and CSV export.

## Self-host

```bash
pnpm i
wrangler secret put BOT_TOKEN
wrangler secret put WEBHOOK_SECRET
wrangler deploy
curl "https://api.telegram.org/bot$BOT_TOKEN/setWebhook?url=https://<your-worker>.workers.dev/webhook&secret_token=$WEBHOOK_SECRET"
```

## Stack

[grammY](https://grammy.dev/) on Cloudflare Workers, state in a Durable Object backed by SQLite, Pro upgrades billed with Telegram Stars.

---
Part of Tiny Telegram Tools — https://tg.zovo.one/
