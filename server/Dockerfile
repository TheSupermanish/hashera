# Hashera server: Telegram bot + market-data cron + AI news/rebalancer + oracle updater.
# Runs as an isolated container; needs only OUTBOUND network (MongoDB Atlas,
# HashKey RPC, Telegram long-poll, Vertex AI). No inbound port required.
FROM node:22-slim

WORKDIR /app

# tsx is a devDependency, so install everything (no --omit=dev).
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
# Express health port (not published unless you -p it at run time).
EXPOSE 4000

CMD ["npm", "start"]
