import type { PlaidTransaction } from "../types/plaid";
import { fmt, fmtDate } from "../utils/format";

interface Props {
  transactions: PlaidTransaction[];
  loading?: boolean;
}

export function TransactionsTable({ transactions, loading }: Props) {
  return (
    <div className="transactions-section">
      <h3 className="section-title">Recent Transactions</h3>
      <div className="transactions-card">
        {loading ? (
          <div className="empty-state">
            <span className="empty-state-icon">⏳</span>
            <p>Loading transactions…</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">📭</span>
            <p className="empty-state-title">No transactions found</p>
            <p className="empty-state-sub">
              Transactions will appear here once your accounts have activity.
            </p>
          </div>
        ) : (
          <table className="txn-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th className="text-right">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => {
                // Plaid: positive = money out, negative = money in
                const isInflow = t.amount < 0;
                const desc = t.merchant_name ?? t.name ?? "—";
                const category =
                  t.personal_finance_category?.primary
                    ?.replace(/_/g, " ")
                    .toLowerCase()
                    .replace(/^\w/, (c) => c.toUpperCase()) ?? "";
                return (
                  <tr key={t.transaction_id}>
                    <td className="txn-date">{fmtDate(t.date)}</td>
                    <td className="txn-desc">{desc}</td>
                    <td>
                      {category && (
                        <span className="txn-category">{category}</span>
                      )}
                    </td>
                    <td
                      className={`txn-amount text-right ${isInflow ? "positive" : "negative"}`}
                    >
                      {isInflow ? "+" : "−"}
                      {fmt(Math.abs(t.amount), t.iso_currency_code ?? "USD")}
                    </td>
                    <td>
                      <span
                        className={`txn-status txn-status--${t.pending ? "pending" : "posted"}`}
                      >
                        {t.pending ? "Pending" : "Posted"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
