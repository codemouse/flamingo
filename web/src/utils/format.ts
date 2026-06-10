/** Formats a number as a currency string. Defaults to USD. */
export const fmt = (amount: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    amount,
  );

/** Formats an ISO date string as a short human-readable date. */
export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export const containerIcon = (type: string, subtype: string | null): string => {
  if (type === "credit") return "💳";
  if (subtype === "savings") return "🏦";
  if (subtype === "checking") return "🏧";
  if (type === "investment") return "📈";
  if (type === "loan") return "🏠";
  return "🏦";
};

export const containerLabel = (
  type: string,
  subtype: string | null,
): string => {
  if (type === "credit") return "Credit Card";
  if (subtype === "savings") return "Savings";
  if (subtype === "checking") return "Checking";
  if (subtype) return subtype.charAt(0).toUpperCase() + subtype.slice(1);
  return type.charAt(0).toUpperCase() + type.slice(1);
};
