import type { Metadata } from "next";
import localFont from "next/font/local";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--f-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hashera | Invest in RWA Baskets, directly in your wallet",
  description:
    "Diversified tokenized RWA portfolios reflecting themes, strategies, and narratives. Invest in one click, directly to your wallet, on HashKey Chain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${manrope.variable} min-h-screen font-sans antialiased`}
      >
        <Providers>
          <Header />
          <main className="mx-auto min-h-screen w-full max-w-[1280px] px-4 pb-24 md:px-8">
            {children}
          </main>
          <footer className="border-t border-cesto-border/50 py-8">
            <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-3 px-4 text-center md:px-8">
              <a
                href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT || "hasherafi_bot"}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-cesto-border bg-card/40 px-4 py-2 text-sm text-white transition-colors hover:border-cesto-green/50"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="text-cesto-green">
                  <path d="M21.9 4.3L18.5 20c-.3 1.1-.9 1.4-1.9.9l-5.2-3.8-2.5 2.4c-.3.3-.5.5-1 .5l.4-5.1L16.6 6c.4-.4-.1-.6-.6-.2L6.3 12l-4.9-1.5c-1.1-.3-1.1-1 .2-1.5l19.1-7.4c.9-.3 1.7.2 1.2 2.7z" />
                </svg>
                AI news &amp; rebalance alerts on Telegram
              </a>
              <p className="text-xs text-cesto-desc">
                Hashera · DeFAI RWA indexes on HashKey Chain · USDC settlement via HSP · Built for
                the On-Chain Horizon Hackathon. Backtested results are hypothetical. Nothing here is
                financial advice.
              </p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
