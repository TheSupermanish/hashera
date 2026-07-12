import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { NewsItem } from "@/lib/models";

export const dynamic = "force-dynamic";

// GET /api/news?basket=slug&limit=20 — AI-digested market news
export async function GET(req: NextRequest) {
  await dbConnect();
  const basket = req.nextUrl.searchParams.get("basket");
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 20), 50);

  const query = basket ? { basketSlugs: basket } : {};
  const news = await NewsItem.find(query).sort({ publishedAt: -1 }).limit(limit).lean();
  return NextResponse.json({ news });
}
