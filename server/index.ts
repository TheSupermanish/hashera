// Moltiply server: Telegram bot + market data engine + AI news digester +
// AI rebalancing agent + on-chain oracle updater, in one Express process.

import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import cron from "node-cron";
import { connect } from "./lib/db";
import { updatePrices, pushOracle } from "./lib/prices";
import { digestNews } from "./lib/news";
import { startBot, broadcastNews } from "./lib/telegram";
import { runRebalancer } from "./lib/rebalancer";

const PORT = process.env.PORT || 4000;
const app = express();
app.use(express.json());

// Simple bearer guard for manual trigger endpoints.
function guard(req: Request, res: Response, next: NextFunction) {
  const token = process.env.ADMIN_TOKEN;
  if (token && req.headers.authorization !== `Bearer ${token}`) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

app.get("/health", (_req: Request, res: Response) => res.json({ ok: true, ts: new Date().toISOString() }));

app.post("/api/tick/prices", guard, async (_req: Request, res: Response) => {
  try {
    res.json(await updatePrices());
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post("/api/tick/oracle", guard, async (_req: Request, res: Response) => {
  try {
    res.json(await pushOracle());
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post("/api/tick/news", guard, async (_req: Request, res: Response) => {
  try {
    const digest = await digestNews();
    const pushed = await broadcastNews();
    res.json({ ...digest, ...pushed });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post("/api/tick/rebalance", guard, async (req: Request, res: Response) => {
  try {
    res.json(await runRebalancer({ execute: req.query.execute === "1" }));
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

async function main() {
  await connect();
  await startBot();

  // market data: every 5 minutes
  cron.schedule("*/5 * * * *", () => updatePrices().catch((e) => console.error("[cron prices]", e.message)));
  // on-chain oracle push: every 15 minutes
  cron.schedule("*/15 * * * *", () => pushOracle().catch((e) => console.error("[cron oracle]", e.message)));
  // AI news digest: every 30 minutes
  cron.schedule("*/30 * * * *", () => digestNews().catch((e) => console.error("[cron news]", e.message)));
  // telegram news push: every 10 minutes
  cron.schedule("*/10 * * * *", () => broadcastNews().catch((e) => console.error("[cron tg]", e.message)));
  // AI rebalancer: daily at 09:00 JST (00:00 UTC), executes on-chain when keys are set
  cron.schedule("0 0 * * *", () =>
    runRebalancer({ execute: !!process.env.REBALANCER_KEY }).catch((e) =>
      console.error("[cron rebalance]", e.message)
    )
  );

  app.listen(PORT, () => console.log(`[server] listening on :${PORT}`));

  // Warm start so demo data flows immediately.
  updatePrices().catch(() => {});
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
