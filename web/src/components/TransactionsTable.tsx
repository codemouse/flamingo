import type { YodleeTransaction } from "../types/yodlee";
import { fmt, fmtDate } from "../utils/format";

interface Props {
  transactions: YodleeTransaction[];
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
                const isCredit = t.type === "CREDIT";
                const desc =
                  t.merchant?.name ??
                  t.description?.consumer ??
                  t.description?.original ??
                  "—";
                return (
                  <tr key={t.id}>
                    <td className="txn-date">{fmtDate(t.transactionDate)}</td>
                    <td className="txn-desc">{desc}</td>
                    <td>
                      {t.category && (
                        <span className="txn-category">{t.category}</span>
                      )}
                    </td>
                    <td
                      className={`txn-amount text-right ${isCredit ? "positive" : "negative"}`}
                    >
                      {isCredit ? "+" : "-"}
                      {fmt(t.amount.amount, t.amount.currency)}
                    </td>
                    <td>
                      <span
                        className={`txn-status txn-status--${(t.status ?? "").toLowerCase()}`}
                      >
                        {t.status ?? "—"}
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
