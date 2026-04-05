const CURRENCY_SYMBOLS: Record<string, string> = {
  ZAR: "R",
  USD: "$",
  GBP: "£",
  EUR: "€",
  NGN: "₦",
  KES: "KSh",
  GHS: "GH₵",
  EGP: "E£",
  TZS: "TSh",
  UGX: "USh",
};

const CURRENCY_LOCALES: Record<string, string> = {
  ZAR: "en-ZA",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  NGN: "en-NG",
  KES: "sw-KE",
  GHS: "en-GH",
  EGP: "ar-EG",
  TZS: "sw-TZ",
  UGX: "en-UG",
};

export function formatCurrency(amount: number, code = "ZAR"): string {
  const symbol = CURRENCY_SYMBOLS[code] ?? code;
  const locale = CURRENCY_LOCALES[code] ?? "en-ZA";
  return `${symbol} ${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCompact(amount: number, code = "ZAR"): string {
  const symbol = CURRENCY_SYMBOLS[code] ?? code;
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}k`;
  return `${symbol}${amount.toFixed(0)}`;
}
