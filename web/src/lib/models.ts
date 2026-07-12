import mongoose, { Schema, model, models } from "mongoose";

// ------------------------------------------------------------------ Basket

const AllocationSchema = new Schema(
  {
    symbol: { type: String, required: true },
    name: String,
    underlying: String,
    tokenAddress: String,
    weightBps: { type: Number, required: true },
    color: String,
    logo: String,
    logoText: String,
    logoBg: String,
  },
  { _id: false }
);

const BasketSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    symbol: String,
    badge: { type: String, default: "3x Pts" },
    shortDescription: String,
    description: String,
    image: String,
    gradient: String,
    tags: [String],
    platform: { type: String, default: "HashKey Chain" },
    vaultAddress: String,
    entryFeeBps: { type: Number, default: 50 },
    minInvest: { type: Number, default: 25 },
    returnLabel: { type: String, default: "Annual Return" },
    benchmark: { type: String, default: "SPX" },
    allocation: [AllocationSchema],
    risk: {
      title: String,
      characteristics: [{ label: String, text: String, _id: false }],
      factors: [{ label: String, text: String, _id: false }],
      oracleNote: String,
    },
    resources: [{ label: String, url: String, _id: false }],
    launchedAt: Date,
    version: { type: Number, default: 2 },
  },
  { timestamps: true }
);

// -------------------------------------------------------------- PricePoint

const PricePointSchema = new Schema({
  symbol: { type: String, required: true },
  ts: { type: Date, required: true },
  price: { type: Number, required: true },
});
PricePointSchema.index({ symbol: 1, ts: -1 });

// ------------------------------------------------------------------- News

const NewsItemSchema = new Schema(
  {
    title: { type: String, required: true },
    url: String,
    source: String,
    publishedAt: Date,
    summary: String,
    sentiment: { type: String, enum: ["bullish", "bearish", "neutral"], default: "neutral" },
    impact: { type: String, enum: ["high", "medium", "low"], default: "medium" },
    tickers: [String],
    basketSlugs: [String],
    sentToTelegram: { type: Boolean, default: false },
  },
  { timestamps: true }
);
NewsItemSchema.index({ publishedAt: -1 });

// -------------------------------------------------------------- Rebalance

const RebalanceEventSchema = new Schema(
  {
    basketSlug: { type: String, required: true, index: true },
    date: Date,
    oldAllocation: [{ symbol: String, weightBps: Number, _id: false }],
    newAllocation: [{ symbol: String, weightBps: Number, _id: false }],
    reason: String,
    txHash: String,
    triggeredBy: { type: String, default: "ai-agent" },
  },
  { timestamps: true }
);

// ------------------------------------------------------------ Transaction

const TransactionSchema = new Schema(
  {
    wallet: { type: String, required: true, index: true, lowercase: true },
    basketSlug: { type: String, required: true }, // basket slug OR stock symbol
    type: { type: String, enum: ["invest", "redeem", "buy", "sell"], required: true },
    market: { type: String, enum: ["basket", "stock"], default: "basket" },
    usdcAmount: Number,
    shares: Number, // basket shares OR stock units
    price: Number, // execution price (stocks)
    txHash: String,
    ts: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ------------------------------------------------------------- Subscriber

const SubscriberSchema = new Schema(
  {
    chatId: { type: Number, required: true, unique: true },
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

export type BasketDoc = mongoose.InferSchemaType<typeof BasketSchema>;
export type NewsDoc = mongoose.InferSchemaType<typeof NewsItemSchema>;

export const Basket = models.Basket || model("Basket", BasketSchema);
export const PricePoint = models.PricePoint || model("PricePoint", PricePointSchema);
export const NewsItem = models.NewsItem || model("NewsItem", NewsItemSchema);
export const RebalanceEvent = models.RebalanceEvent || model("RebalanceEvent", RebalanceEventSchema);
export const Transaction = models.Transaction || model("Transaction", TransactionSchema);
export const Subscriber = models.Subscriber || model("Subscriber", SubscriberSchema);
