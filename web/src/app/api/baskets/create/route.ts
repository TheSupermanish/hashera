import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Basket } from "@/lib/models";
import { SEED_ASSETS, donutColor } from "@/lib/seedData";
import { DEPLOYMENT } from "@/lib/contracts";

export const dynamic = "force-dynamic";

const GRADIENTS = [
  "linear-gradient(135deg, #065f46 0%, #0e7490 50%, #111827 100%)",
  "linear-gradient(135deg, #4c1d95 0%, #be185d 55%, #111827 100%)",
  "linear-gradient(135deg, #1e3a5f 0%, #7f1d1d 50%, #0f172a 100%)",
  "linear-gradient(135deg, #b45309 0%, #4c1d95 60%, #111827 100%)",
];

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// POST /api/baskets/create — build a custom index from the asset catalog.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object")
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const name: string = (body.name ?? "").trim();
  const description: string = (body.description ?? "").trim();
  const allocation: { symbol: string; weightBps: number }[] = Array.isArray(body.allocation)
    ? body.allocation
    : [];

  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (allocation.length < 2)
    return NextResponse.json({ error: "Pick at least 2 assets." }, { status: 400 });
  if (!allocation.every((a) => a && typeof a.symbol === "string" && Number.isInteger(a.weightBps) && a.weightBps > 0))
    return NextResponse.json({ error: "Each asset needs a positive whole-number weight." }, { status: 400 });

  const sum = allocation.reduce((s, a) => s + (a.weightBps || 0), 0);
  if (sum !== 10000)
    return NextResponse.json({ error: `Weights must sum to 100% (currently ${sum / 100}%).` }, { status: 400 });

  const bySymbol = Object.fromEntries(SEED_ASSETS.map((a) => [a.symbol, a]));
  for (const a of allocation) {
    if (!bySymbol[a.symbol]) return NextResponse.json({ error: `Unknown asset ${a.symbol}.` }, { status: 400 });
  }

  await dbConnect();

  // Unique slug (append a counter if taken).
  const base = slugify(name) || "index";
  let slug = base;
  for (let i = 2; await Basket.exists({ slug }); i++) slug = `${base}-${i}`;

  const enriched = allocation.map((a, i) => {
    const asset = bySymbol[a.symbol];
    return {
      symbol: a.symbol,
      name: asset.name,
      underlying: asset.underlying,
      tokenAddress: DEPLOYMENT.tokens[a.symbol] ?? "",
      weightBps: a.weightBps,
      color: donutColor(i),
      logo: asset.logo ?? "",
      logoText: asset.logoText,
      logoBg: asset.logoBg,
    };
  });

  const gradient = GRADIENTS[Math.abs(hash(slug)) % GRADIENTS.length];

  await Basket.create({
    slug,
    name,
    symbol: `x${base.replace(/-/g, "").slice(0, 5).toUpperCase()}`,
    badge: "Custom",
    shortDescription: description || `A custom index of ${allocation.length} tokenized assets.`,
    description: description || `A custom index of ${allocation.length} tokenized RWA assets on HashKey Chain, built with the Moltiply index builder.`,
    gradient,
    tags: ["Custom", "Index"],
    platform: "HashKey Chain",
    vaultAddress: "",
    entryFeeBps: 50,
    minInvest: 25,
    returnLabel: "Annual Return",
    benchmark: "SPX",
    allocation: enriched,
    risk: {
      title: `${name} Strategy`,
      characteristics: [
        { label: "No Liquidation Risk (Spot)", text: "synthetic spot, no margin liquidation." },
        { label: "Custom Index", text: "user-defined allocation; not curated by the Moltiply team." },
      ],
      factors: [
        { label: "Concentration", text: "check that no single asset dominates the weights." },
        { label: "Smart Contract / Oracle Risk", text: "synthetic assets depend on protocol and oracle integrity." },
      ],
      oracleNote: "Assets priced via NYSE/NASDAQ-linked and crypto oracle feeds.",
    },
    resources: [{ label: "HashKey Chain Explorer", url: "https://hashkey.blockscout.com" }],
    launchedAt: new Date(),
    version: 1,
  });

  return NextResponse.json({ ok: true, slug });
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}
