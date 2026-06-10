import { useQuery } from "@tanstack/react-query";
import { getMyLiabilities } from "../api/plaid";
import { fmt } from "../utils/format";

export function LiabilitiesPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["plaid", "liabilities"],
    queryFn: getMyLiabilities,
    retry: 1,
  });

  const allCredit = (data ?? []).flatMap((d) => d.liabilities?.credit ?? []);
  const allStudent = (data ?? []).flatMap((d) => d.liabilities?.student ?? []);
  const allMortgage = (data ?? []).flatMap(
    (d) => d.liabilities?.mortgage ?? [],
  );
  const hasAny = allCredit.length + allStudent.length + allMortgage.length > 0;

  return (
    <div className="acct-mgr-card">
      <div className="acct-mgr-header">
        <div className="acct-mgr-header-left">
          <span className="section-title">Liabilities</span>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading liabilities…</p>
        </div>
      ) : !hasAny ? (
        <div className="acct-mgr-empty">
          No liability data available — your linked accounts may not include
          credit cards, student loans, or mortgages.
        </div>
      ) : (
        <div className="acct-mgr-table-wrap">
          {allCredit.length > 0 && (
            <>
              <div style={{ padding: ".5rem 1rem", fontWeight: 600 }}>
                Credit Cards
              </div>
              <table className="acct-mgr-table">
                <thead>
                  <tr>
                    <th>Statement Balance</th>
                    <th>Min Payment</th>
                    <th>Last Payment</th>
                    <th>Next Due</th>
                    <th>APRs</th>
                  </tr>
                </thead>
                <tbody>
                  {allCredit.map((c) => (
                    <tr key={c.account_id}>
                      <td>
                        {c.last_statement_balance != null
                          ? fmt(c.last_statement_balance)
                          : "—"}
                      </td>
                      <td>
                        {c.minimum_payment_amount != null
                          ? fmt(c.minimum_payment_amount)
                          : "—"}
                      </td>
                      <td>
                        {c.last_payment_amount != null
                          ? fmt(c.last_payment_amount)
                          : "—"}
                        {c.last_payment_date && (
                          <span className="text-muted">
                            {" "}
                            on {c.last_payment_date}
                          </span>
                        )}
                      </td>
                      <td>{c.next_payment_due_date ?? "—"}</td>
                      <td>
                        {c.aprs.map((a, i) => (
                          <span
                            key={i}
                            className="txn-category"
                            style={{ marginRight: ".25rem" }}
                          >
                            {a.apr_type}: {a.apr_percentage}%
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {allStudent.length > 0 && (
            <>
              <div style={{ padding: ".5rem 1rem", fontWeight: 600 }}>
                Student Loans
              </div>
              <table className="acct-mgr-table">
                <thead>
                  <tr>
                    <th>Loan</th>
                    <th>Rate</th>
                    <th>YTD Interest</th>
                    <th>YTD Principal</th>
                    <th>Payoff Date</th>
                  </tr>
                </thead>
                <tbody>
                  {allStudent.map((s) => (
                    <tr key={s.account_id}>
                      <td>{s.loan_name ?? "—"}</td>
                      <td>{s.interest_rate_percentage}%</td>
                      <td>
                        {s.ytd_interest_paid != null
                          ? fmt(s.ytd_interest_paid)
                          : "—"}
                      </td>
                      <td>
                        {s.ytd_principal_paid != null
                          ? fmt(s.ytd_principal_paid)
                          : "—"}
                      </td>
                      <td>{s.expected_payoff_date ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {allMortgage.length > 0 && (
            <>
              <div style={{ padding: ".5rem 1rem", fontWeight: 600 }}>
                Mortgages
              </div>
              <table className="acct-mgr-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Rate</th>
                    <th>Next Payment</th>
                    <th>Maturity</th>
                    <th>Past Due</th>
                  </tr>
                </thead>
                <tbody>
                  {allMortgage.map((m) => (
                    <tr key={m.account_id}>
                      <td>{m.loan_type_description ?? "—"}</td>
                      <td>
                        {m.interest_rate.percentage != null
                          ? `${m.interest_rate.percentage}% (${m.interest_rate.type ?? "—"})`
                          : "—"}
                      </td>
                      <td>
                        {m.next_monthly_payment != null
                          ? fmt(m.next_monthly_payment)
                          : "—"}
                        {m.next_payment_due_date && (
                          <span className="text-muted">
                            {" "}
                            on {m.next_payment_due_date}
                          </span>
                        )}
                      </td>
                      <td>{m.maturity_date ?? "—"}</td>
                      <td>
                        <span
                          className={
                            m.past_due_amount ? "negative" : "positive"
                          }
                        >
                          {m.past_due_amount != null
                            ? fmt(m.past_due_amount)
                            : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
