const mongoose = require("mongoose");
const { Schema } = mongoose;

// Mirrors web/src/lib/models.ts — both apps share the same MongoDB.

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

module.exports = {
  Basket: mongoose.models.Basket || mongoose.model("Basket", BasketSchema),
  PricePoint: mongoose.models.PricePoint || mongoose.model("PricePoint", PricePointSchema),
  NewsItem: mongoose.models.NewsItem || mongoose.model("NewsItem", NewsItemSchema),
  Subscriber: mongoose.models.Subscriber || mongoose.model("Subscriber", SubscriberSchema),
  RebalanceEvent: mongoose.models.RebalanceEvent || mongoose.model("RebalanceEvent", RebalanceEventSchema),
};
