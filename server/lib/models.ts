import mongoose, { Schema, type Model } from "mongoose";
import type { Allocation } from "../types";

// Mirrors web/src/lib/models.ts — both apps share the same MongoDB.

export interface BasketDoc {
  slug: string;
  name: string;
  symbol?: string;
  badge?: string;
  shortDescription?: string;
  description?: string;
  gradient?: string;
  tags?: string[];
  platform?: string;
  vaultAddress?: string;
  entryFeeBps?: number;
  minInvest?: number;
  returnLabel?: string;
  benchmark?: string;
  allocation: Allocation[];
  risk?: unknown;
  resources?: unknown[];
  launchedAt?: Date;
  version?: number;
}

export interface PricePointDoc {
  symbol: string;
  ts: Date;
  price: number;
}

export type Sentiment = "bullish" | "bearish" | "neutral";
export type Impact = "high" | "medium" | "low";

export interface NewsItemDoc {
  title?: string;
  url?: string;
  source?: string;
  publishedAt?: Date;
  summary?: string;
  sentiment?: string;
  impact?: string;
  tickers?: string[];
  basketSlugs?: string[];
  sentToTelegram?: boolean;
}

export interface SubscriberDoc {
  chatId: number;
  username?: string;
  firstName?: string;
  wallet?: string;
  baskets?: string[];
  newsAlerts?: boolean;
  rebalanceAlerts?: boolean;
  active?: boolean;
}

export interface RebalanceEventDoc {
  basketSlug: string;
  date?: Date;
  oldAllocation?: Allocation[];
  newAllocation?: Allocation[];
  reason?: string;
  txHash?: string;
  triggeredBy?: string;
}

const BasketSchema = new Schema(
  {
    slug: { type: String, unique: true, index: true },
    name: String,
    symbol: String,
    badge: String,
    shortDescription: String,
    description: String,
    gradient: String,
    tags: [String],
    platform: String,
    vaultAddress: String,
    entryFeeBps: Number,
    minInvest: Number,
    returnLabel: String,
    benchmark: String,
    allocation: [
      {
        symbol: String, name: String, underlying: String, tokenAddress: String,
        weightBps: Number, color: String, logoText: String, logoBg: String, _id: false,
      },
    ],
    risk: Schema.Types.Mixed,
    resources: [Schema.Types.Mixed],
    launchedAt: Date,
    version: Number,
  },
  { timestamps: true, strict: false }
);

const PricePointSchema = new Schema({
  symbol: { type: String, required: true },
  ts: { type: Date, required: true },
  price: { type: Number, required: true },
});
PricePointSchema.index({ symbol: 1, ts: -1 });

const NewsItemSchema = new Schema(
  {
    title: String,
    url: String,
    source: String,
    publishedAt: Date,
    summary: String,
    sentiment: { type: String, default: "neutral" },
    impact: { type: String, default: "medium" },
    tickers: [String],
    basketSlugs: [String],
    sentToTelegram: { type: Boolean, default: false },
  },
  { timestamps: true }
);
NewsItemSchema.index({ publishedAt: -1 });

const SubscriberSchema = new Schema(
  {
    chatId: { type: Number, unique: true },
    username: String,
    firstName: String,
    wallet: String,
    baskets: [String],
    newsAlerts: { type: Boolean, default: true },
    rebalanceAlerts: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const RebalanceEventSchema = new Schema(
  {
    basketSlug: { type: String, index: true },
    date: Date,
    oldAllocation: [Schema.Types.Mixed],
    newAllocation: [Schema.Types.Mixed],
    reason: String,
    txHash: String,
    triggeredBy: String,
  },
  { timestamps: true }
);

const models = mongoose.models as Record<string, Model<unknown> | undefined>;

export const Basket =
  (models.Basket as Model<BasketDoc>) || mongoose.model<BasketDoc>("Basket", BasketSchema);
export const PricePoint =
  (models.PricePoint as Model<PricePointDoc>) || mongoose.model<PricePointDoc>("PricePoint", PricePointSchema);
export const NewsItem =
  (models.NewsItem as Model<NewsItemDoc>) || mongoose.model<NewsItemDoc>("NewsItem", NewsItemSchema);
export const Subscriber =
  (models.Subscriber as Model<SubscriberDoc>) || mongoose.model<SubscriberDoc>("Subscriber", SubscriberSchema);
export const RebalanceEvent =
  (models.RebalanceEvent as Model<RebalanceEventDoc>) ||
  mongoose.model<RebalanceEventDoc>("RebalanceEvent", RebalanceEventSchema);
