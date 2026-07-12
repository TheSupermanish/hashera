"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "./ConnectButton";

const NAV = [
  { href: "/baskets", label: "Indexes", beta: false },
  { href: "/stocks", label: "Stocks", beta: false },
  { href: "/positions", label: "Positions", beta: false },
  { href: "/create", label: "Create", beta: false },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky inset-x-0 top-0 z-50 h-16 shrink-0 bg-background/75 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-full max-w-full items-center justify-between px-2.5 md:px-6">
        <Link href="/baskets" className="flex shrink-0 items-center rounded-md">
          <span className="font-manrope text-[22px] font-extrabold tracking-tight text-white">
            m<span className="text-cesto-green">o</span>ltiply
          </span>
        </Link>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-lg border border-[#1a2924] bg-[#0c1a18] p-1 lg:flex">
          {NAV.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#1a2924] text-white"
                    : "text-muted-foreground hover:bg-[#1a2924] hover:text-white"
                }`}
              >
                {item.label}
                {item.beta && (
                  <span className="rounded-full bg-cesto-green px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#091313]">
                    Beta
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <ConnectButton />
      </div>

      {/* mobile nav */}
      <nav className="cesto-no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden">
        {NAV.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`whitespace-nowrap rounded-md px-3.5 py-1.5 text-sm ${
                active ? "bg-[#1a2924] text-white" : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
