import type { YodleeAccount } from '../types/yodlee';

const fmt = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function containerIcon(container: string, accountType: string) {
  if (container === 'creditCard') return '💳';
  if (accountType === 'SAVINGS') return '🏦';
  if (accountType === 'CHECKING') return '🏧';
  if (container === 'investment') return '📈';
  return '🏦';
}

function containerLabel(container: string, accountType: string) {
  if (container === 'creditCard') return 'Credit Card';
  if (accountType === 'SAVINGS') return 'Savings';
  if (accountType === 'CHECKING') return 'Checking';
  return accountType || container;
}

interface Props {
  account: YodleeAccount;
}

export function AccountCard({ account }: Props) {
  const isCreditCard = account.CONTAINER === 'creditCard';
  const utilization =
    isCreditCard && account.totalCreditLine?.amount
      ? (account.balance.amount / account.totalCreditLine.amount) * 100
      : null;

  return (
    <div className={`account-card account-card--${account.CONTAINER}`}>
      <div className="account-card-header">
        <span className="account-card-icon">
          {containerIcon(account.CONTAINER, account.accountType)}
        </span>
        <div className="account-card-meta">
          <span className="account-card-name">{account.accountName}</span>
          <span className="account-card-type">
            {containerLabel(account.CONTAINER, account.accountType)} · {account.accountNumber}
          </span>
        </div>
        <span className="account-card-provider">{account.providerName}</span>
      </div>

      <div className="account-card-balance">
        <span className="account-card-balance-label">
          {isCreditCard ? 'Balance Owed' : 'Current Balance'}
        </span>
        <span className={`account-card-balance-amount ${isCreditCard ? 'negative' : 'positive'}`}>
          {fmt(account.balance.amount, account.balance.currency)}
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
              className={`credit-bar-fill ${utilization > 70 ? 'high' : utilization > 30 ? 'mid' : 'low'}`}
              style={{ width: `${Math.min(utilization, 100)}%` }}
            />
          </div>
          <div className="credit-row credit-row--small">
            <span className="credit-label">Available Credit</span>
            <span>{fmt(account.availableCredit?.amount ?? 0, account.balance.currency)}</span>
          </div>
          <div className="credit-row credit-row--small">
            <span className="credit-label">Credit Limit</span>
            <span>{fmt(account.totalCreditLine?.amount ?? 0, account.balance.currency)}</span>
          </div>
          {account.apr != null && (
            <div className="credit-row credit-row--small">
              <span className="credit-label">APR</span>
              <span>{account.apr}%</span>
            </div>
          )}
        </div>
      )}

      {!isCreditCard && (
        <div className="account-card-bank">
          {account.availableBalance && (
            <div className="bank-row">
              <span className="bank-label">Available</span>
              <span className="bank-value positive">
                {fmt(account.availableBalance.amount, account.balance.currency)}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="account-card-footer">
        Updated {fmtDate(account.lastUpdated)}
      </div>
    </div>
  );
}
