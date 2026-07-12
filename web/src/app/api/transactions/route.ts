import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Transaction } from "@/lib/models";

export const dynamic = "force-dynamic";

// POST /api/transactions — record an on-chain invest/redeem for portfolio history
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object")
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  const { wallet, basketSlug, type, market, usdcAmount, shares, price, txHash } = body;
  if (!wallet || !basketSlug || !["invest", "redeem", "buy", "sell"].includes(type)) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  await dbConnect();
  const tx = await Transaction.create({
    wallet,
    basketSlug,
    type,
    market: market ?? (["buy", "sell"].includes(type) ? "stock" : "basket"),
    usdcAmount,
    shares,
    price,
    txHash,
  });
  return NextResponse.json({ ok: true, id: tx._id });
}

// GET /api/transactions?wallet=0x...[&symbol=VSTon] — wallet transaction history
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet")?.toLowerCase();
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });
  await dbConnect();
  const query: Record<string, unknown> = { wallet };
  if (symbol) {
    query.basketSlug = symbol;
    query.market = "stock"; // scope to stock trades; avoids slug/symbol collisions
  }
  const txs = await Transaction.find(query).sort({ ts: -1 }).limit(200).lean();

  // Net invested per basket/stock (cost basis for PnL display)
  const invested: Record<string, number> = {};
  for (const t of txs as any[]) {
    const amt = Number(t.usdcAmount) || 0; // guard against missing/NaN amounts
    const isBuy = t.type === "invest" || t.type === "buy";
    invested[t.basketSlug] = (invested[t.basketSlug] ?? 0) + (isBuy ? amt : -amt);
  }
  return NextResponse.json({ transactions: txs, invested });
}
