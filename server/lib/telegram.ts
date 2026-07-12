// Moltiply Telegram bot (grammY): basket quotes, AI news digests,
// subscriptions, and push alerts for news + AI rebalances.

import { Bot, type Context } from "grammy";
import { Basket, NewsItem, Subscriber, type RebalanceEventDoc } from "./models";
import { quote, basketReturn } from "./metrics";

const WEB_URL = process.env.WEB_URL || "http://localhost:3000";

let bot: Bot | null = null;

const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
const arrow = (v: number) => (v >= 0 ? "🟢" : "🔴");

function esc(s: unknown): string {
  return String(s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] ?? c));
}

async function upsertSubscriber(ctx: Context) {
  return Subscriber.findOneAndUpdate(
    { chatId: ctx.chat!.id },
    {
      $set: {
        username: ctx.from?.username,
        firstName: ctx.from?.first_name,
        active: true,
      },
    },
    { upsert: true, new: true }
  );
}

function registerHandlers(b: Bot) {
  b.command("start", async (ctx) => {
    await upsertSubscriber(ctx);
    await ctx.reply(
      `<b>Welcome to Hashera 🧺</b>\n\n` +
        `AI-managed RWA investment baskets on HashKey Chain. One click, straight to your wallet.\n\n` +
        `<b>Commands</b>\n` +
        `/baskets — all baskets with live returns\n` +
        `/basket &lt;slug&gt; — allocation and prices\n` +
        `/news — latest AI market digest\n` +
        `/subscribe &lt;slug&gt; — alerts for a basket\n` +
        `/mysubs — your subscriptions\n\n` +
        `You are now receiving AI news digests. Mute them with /mute.\n\n` +
        `🌐 ${WEB_URL}`,
      { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
    );
  });

  b.command("baskets", async (ctx) => {
    const baskets = await Basket.find({}).lean();
    if (!baskets.length) return ctx.reply("No baskets yet.");
    let out = "<b>📊 Investment Baskets</b>\n\n";
    for (const bk of baskets) {
      const [d1, y1] = await Promise.all([
        basketReturn(bk.allocation, 2),
        basketReturn(bk.allocation, 366),
      ]);
      out += `${arrow(d1)} <b>${esc(bk.name)}</b> (<code>${bk.slug}</code>)\n`;
      out += `      24h ${fmtPct(d1)} · 1y ${fmtPct(y1)}\n`;
    }
    out += `\n${WEB_URL}/baskets`;
    await ctx.reply(out, { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
  });

  b.command("basket", async (ctx) => {
    const slug = (ctx.match ?? "").trim();
    const bk = await Basket.findOne({ slug }).lean();
    if (!bk) {
      const all = await Basket.find({}).select("slug").lean();
      return ctx.reply(`Unknown basket. Try one of:\n${all.map((x) => `/basket ${x.slug}`).join("\n")}`);
    }
    const y1 = await basketReturn(bk.allocation, 366);
    let out = `<b>${esc(bk.name)}</b> ${arrow(y1)} 1y ${fmtPct(y1)}\n`;
    out += `${esc(bk.shortDescription ?? "")}\n\n<b>Allocation</b>\n`;
    for (const a of bk.allocation) {
      const q = await quote(a.symbol);
      out += `· ${a.symbol} ${(a.weightBps / 100).toFixed(0)}%`;
      if (q) out += ` — $${q.price.toLocaleString()} (${fmtPct(q.changePct24h)} 24h)`;
      out += "\n";
    }
    out += `\n💰 Min invest: ${bk.minInvest ?? 25} USDC · Fee ${(bk.entryFeeBps ?? 50) / 100}%`;
    out += `\n${WEB_URL}/baskets/${bk.slug}`;
    await ctx.reply(out, { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
  });

  b.command("news", async (ctx) => {
    const items = await NewsItem.find({}).sort({ publishedAt: -1 }).limit(5).lean();
    if (!items.length) return ctx.reply("No news yet.");
    let out = "<b>🧠 AI Market Digest</b>\n\n";
    for (const n of items) {
      const emoji = n.sentiment === "bullish" ? "🟢" : n.sentiment === "bearish" ? "🔴" : "⚪️";
      out += `${emoji} <b>${esc(n.title)}</b>\n${esc(n.summary ?? "")}\n`;
      if (n.basketSlugs?.length) out += `→ ${n.basketSlugs.join(", ")}\n`;
      out += "\n";
    }
    await ctx.reply(out, { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
  });

  b.command("subscribe", async (ctx) => {
    const slug = (ctx.match ?? "").trim();
    const bk = await Basket.findOne({ slug }).lean();
    if (!bk) return ctx.reply("Unknown basket slug. See /baskets for the list.");
    await upsertSubscriber(ctx);
    await Subscriber.updateOne({ chatId: ctx.chat!.id }, { $addToSet: { baskets: slug } });
    await ctx.reply(`✅ Subscribed to <b>${esc(bk.name)}</b>. You'll get rebalance + news alerts.`, { parse_mode: "HTML" });
  });

  b.command("unsubscribe", async (ctx) => {
    const slug = (ctx.match ?? "").trim();
    await Subscriber.updateOne({ chatId: ctx.chat!.id }, { $pull: { baskets: slug } });
    await ctx.reply(`Removed ${slug}.`);
  });

  b.command("mysubs", async (ctx) => {
    const sub = await Subscriber.findOne({ chatId: ctx.chat!.id }).lean();
    if (!sub?.baskets?.length) return ctx.reply("No basket subscriptions. Use /subscribe <slug>.");
    await ctx.reply(`Your baskets:\n${sub.baskets.map((s) => `· ${s}`).join("\n")}`);
  });

  b.command("mute", async (ctx) => {
    await Subscriber.updateOne({ chatId: ctx.chat!.id }, { $set: { newsAlerts: false } });
    await ctx.reply("🔕 News digests muted. /unmute to re-enable.");
  });

  b.command("unmute", async (ctx) => {
    await upsertSubscriber(ctx);
    await Subscriber.updateOne({ chatId: ctx.chat!.id }, { $set: { newsAlerts: true } });
    await ctx.reply("🔔 News digests enabled.");
  });

  b.command("help", (ctx) =>
    ctx.reply("Commands: /baskets /basket <slug> /news /subscribe <slug> /unsubscribe <slug> /mysubs /mute /unmute")
  );
}

export async function startBot(): Promise<Bot | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN not set, bot disabled");
    return null;
  }
  bot = new Bot(token);
  registerHandlers(bot);
  bot.catch((err) => console.error("[telegram] error:", err.message));
  bot.start({ drop_pending_updates: true });
  console.log("[telegram] bot polling started");
  return bot;
}

export async function broadcast(text: string, filter: Record<string, unknown> = {}): Promise<{ sent: number }> {
  if (!bot) return { sent: 0 };
  const subs = await Subscriber.find({ active: true, ...filter }).lean();
  let sent = 0;
  for (const s of subs) {
    try {
      await bot.api.sendMessage(s.chatId, text, {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      });
      sent++;
    } catch (e) {
      if (/blocked|chat not found/i.test((e as Error).message)) {
        await Subscriber.updateOne({ chatId: s.chatId }, { $set: { active: false } });
      }
    }
    await new Promise((r) => setTimeout(r, 50)); // stay under rate limits
  }
  return { sent };
}

/** Push unsent high/medium-impact news items to subscribers. */
export async function broadcastNews(): Promise<{ sent: number }> {
  if (!bot) return { sent: 0 };
  const items = await NewsItem.find({
    sentToTelegram: false,
    impact: { $in: ["high", "medium"] },
  })
    .sort({ publishedAt: 1 })
    .limit(5)
    .lean();

  let sent = 0;
  for (const n of items) {
    const emoji = n.sentiment === "bullish" ? "🟢" : n.sentiment === "bearish" ? "🔴" : "⚪️";
    const text =
      `${emoji} <b>${esc(n.title)}</b>\n\n${esc(n.summary ?? "")}` +
      (n.basketSlugs?.length
        ? `\n\n📊 Affected: ${n.basketSlugs.map((s) => `${WEB_URL}/baskets/${s}`).join("\n")}`
        : "");
    const res = await broadcast(text, { newsAlerts: true });
    sent += res.sent;
    await NewsItem.updateOne({ _id: n._id }, { $set: { sentToTelegram: true } });
  }
  if (sent) console.log(`[telegram] pushed news to ${sent} chats`);
  return { sent };
}

/** Alert subscribers of a basket about an AI rebalance. */
export async function broadcastRebalance(event: RebalanceEventDoc, basketName: string): Promise<{ sent: number }> {
  const text =
    `⚖️ <b>AI Rebalance — ${esc(basketName)}</b>\n\n${esc(event.reason)}\n\n` +
    `<b>New allocation</b>\n` +
    (event.newAllocation ?? []).map((a) => `· ${a.symbol} ${(a.weightBps / 100).toFixed(0)}%`).join("\n") +
    (event.txHash ? `\n\ntx: ${event.txHash}` : "") +
    `\n${WEB_URL}/baskets/${event.basketSlug}`;
  return broadcast(text, { rebalanceAlerts: true, baskets: event.basketSlug });
}
