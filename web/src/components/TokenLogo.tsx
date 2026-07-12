/* Token icon: image asset when available, letter-circle fallback otherwise. */

export interface TokenIconData {
  logo?: string | null;
  logoText: string;
  logoBg: string;
}

export function TokenLogo({
  token,
  size = 36,
  className = "",
}: {
  token: TokenIconData;
  size?: number;
  className?: string;
}) {
  if (token.logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={token.logo}
        alt={token.logoText}
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ${className}`}
      style={{
        width: size,
        height: size,
        background: token.logoBg,
        fontSize: size * 0.34,
      }}
    >
      {token.logoText}
    </span>
  );
}

export function TokenLogoStack({
  tokens,
  max = 3,
  size = 24,
}: {
  tokens: TokenIconData[];
  max?: number;
  size?: number;
}) {
  const shown = tokens.slice(0, max);
  const rest = tokens.length - shown.length;
  return (
    <span className="inline-flex items-center -space-x-1.5">
      {shown.map((t, i) => (
        <span
          key={i}
          className="relative inline-flex overflow-hidden rounded-full ring-2 ring-background"
          style={{ zIndex: shown.length - i }}
        >
          <TokenLogo token={t} size={size} />
        </span>
      ))}
      {rest > 0 && (
        <span
          className="relative z-0 inline-flex items-center justify-center rounded-full bg-secondary text-[10px] font-medium text-muted-foreground ring-2 ring-background"
          style={{ width: size, height: size }}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}
