import { useQuery } from "@tanstack/react-query";
import { getMyHoldings } from "../api/plaid";
import { fmt } from "../utils/format";

export function InvestmentsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["plaid", "holdings"],
    queryFn: getMyHoldings,
    retry: 1,
  });

  const allHoldings = (data ?? []).flatMap((d) =>
    d.holdings.map((h) => {
      const sec = d.securities.find((s) => s.security_id === h.security_id);
      const acc = d.accounts.find((a) => a.account_id === h.account_id);
      return {
        ...h,
        security: sec,
        account: acc,
        institutionName: d.institutionName,
      };
    }),
  );

  const totalValue = allHoldings.reduce(
    (sum, h) => sum + h.institution_value,
    0,
  );

  return (
    <div className="acct-mgr-card">
      <div className="acct-mgr-header">
        <div className="acct-mgr-header-left">
          <span className="section-title">Investments — Holdings</span>
          {totalValue > 0 && (
            <span
              className="text-muted"
              style={{ marginLeft: "1rem", fontSize: ".875rem" }}
            >
              Total: {fmt(totalValue)}
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading holdings…</p>
        </div>
      ) : allHoldings.length === 0 ? (
        <div className="acct-mgr-empty">
          No investment holdings — link a brokerage or retirement account to see
          holdings.
        </div>
      ) : (
        <div className="acct-mgr-table-wrap">
          <table className="acct-mgr-table">
            <thead>
              <tr>
                <th>Security</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Value</th>
                <th>Account</th>
              </tr>
            </thead>
            <tbody>
              {allHoldings.map((h, i) => (
                <tr key={`${h.account_id}-${h.security_id}-${i}`}>
                  <td>
                    <strong>{h.security?.ticker_symbol ?? "—"}</strong>
                    {h.security?.name && (
                      <div
                        className="text-muted"
                        style={{ fontSize: ".75rem" }}
                      >
                        {h.security.name}
                      </div>
                    )}
                  </td>
                  <td>{h.security?.type ?? "—"}</td>
                  <td>{h.quantity.toFixed(4)}</td>
                  <td>
                    {fmt(h.institution_price, h.iso_currency_code ?? "USD")}
                  </td>
                  <td>
                    <span className="positive">
                      {fmt(h.institution_value, h.iso_currency_code ?? "USD")}
                    </span>
                  </td>
                  <td>{h.account?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
