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

export const containerIcon = (
  container: string,
  accountType: string,
): string => {
  if (container === "creditCard") return "💳";
  if (accountType === "SAVINGS") return "🏦";
  if (accountType === "CHECKING") return "🏧";
  if (container === "investment") return "📈";
  return "🏦";
};

export const containerLabel = (
  container: string,
  accountType: string,
): string => {
  if (container === "creditCard") return "Credit Card";
  if (accountType === "SAVINGS") return "Savings";
  if (accountType === "CHECKING") return "Checking";
  return accountType || container;
};
