import type { PlaidAccount } from "../types/plaid";
import { fmt } from "../utils/format";

interface Props {
  accounts: PlaidAccount[];
}

export function NetWorthBanner({ accounts }: Props) {
  const assets = accounts
    .filter((a) => a.type !== "credit" && a.type !== "loan")
    .reduce((sum, a) => sum + (a.balances.current ?? 0), 0);
  const liabilities = accounts
    .filter((a) => a.type === "credit" || a.type === "loan")
    .reduce((sum, a) => sum + (a.balances.current ?? 0), 0);
  const netWorth = assets - liabilities;

  return (
    <div className="net-worth-banner">
      <div className="net-worth-main">
        <span className="net-worth-label">Net Worth</span>
        <span
          className={`net-worth-value ${netWorth >= 0 ? "positive" : "negative"}`}
        >
          {fmt(netWorth)}
        </span>
      </div>
      <div className="net-worth-stats">
        <div className="stat">
          <span className="stat-label">Total Assets</span>
          <span className="stat-value positive">{fmt(assets)}</span>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <span className="stat-label">Total Liabilities</span>
          <span className="stat-value negative">{fmt(liabilities)}</span>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <span className="stat-label">Accounts Linked</span>
          <span className="stat-value">{accounts.length}</span>
        </div>
      </div>
    </div>
  );
}
