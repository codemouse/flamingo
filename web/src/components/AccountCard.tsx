import type { PlaidAccount } from "../types/plaid";
import { fmt, containerIcon, containerLabel } from "../utils/format";

interface Props {
  account: PlaidAccount;
}

export function AccountCard({ account }: Props) {
  const isCreditCard = account.type === "credit";
  const balance = account.balances.current ?? account.balances.available ?? 0;
  const currency = account.balances.iso_currency_code ?? "USD";

  const utilization =
    isCreditCard && account.balances.limit
      ? (balance / account.balances.limit) * 100
      : null;

  return (
    <div className={`account-card account-card--${account.type}`}>
      <div className="account-card-header">
        <span className="account-card-icon">
          {containerIcon(account.type, account.subtype)}
        </span>
        <div className="account-card-meta">
          <span className="account-card-name">{account.name}</span>
          <span className="account-card-type">
            {containerLabel(account.type, account.subtype)}
            {account.mask ? ` · ••••${account.mask}` : ""}
          </span>
        </div>
        {account.institutionName && (
          <span className="account-card-provider">
            {account.institutionName}
          </span>
        )}
      </div>

      <div className="account-card-balance">
        <span className="account-card-balance-label">
          {isCreditCard ? "Balance Owed" : "Current Balance"}
        </span>
        <span
          className={`account-card-balance-amount ${isCreditCard ? "negative" : "positive"}`}
        >
          {fmt(balance, currency)}
        </span>
      </div>

      {isCreditCard && utilization !== null && (
        <div className="account-card-credit">
          <div className="credit-row">
            <span className="credit-label">Credit Used</span>
            <span className="credit-pct">{utilization.toFixed(0)}%</span>
          </div>
          <div className="credit-bar">
            <div
              className={`credit-bar-fill ${utilization > 70 ? "high" : utilization > 30 ? "mid" : "low"}`}
              style={{ width: `${Math.min(utilization, 100)}%` }}
            />
          </div>
          <div className="credit-row credit-row--small">
            <span className="credit-label">Available Credit</span>
            <span>{fmt(account.balances.available ?? 0, currency)}</span>
          </div>
          <div className="credit-row credit-row--small">
            <span className="credit-label">Credit Limit</span>
            <span>{fmt(account.balances.limit ?? 0, currency)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
