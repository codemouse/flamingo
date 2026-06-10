import { useQuery } from "@tanstack/react-query";
import { getMyAuth } from "../api/plaid";

export function AuthDetailsPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["plaid", "auth"],
    queryFn: getMyAuth,
    retry: 1,
  });

  return (
    <div className="acct-mgr-card">
      <div className="acct-mgr-header">
        <div className="acct-mgr-header-left">
          <span className="section-title">Account & Routing Numbers</span>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading auth data…</p>
        </div>
      ) : error ? (
        <div className="alert alert-error">
          Auth product is not enabled on this Item or the institution does not
          support it.
        </div>
      ) : !data || data.length === 0 ? (
        <div className="acct-mgr-empty">No auth data available.</div>
      ) : (
        <div className="acct-mgr-table-wrap">
          <table className="acct-mgr-table">
            <thead>
              <tr>
                <th>Institution</th>
                <th>Account</th>
                <th>Routing</th>
                <th>Account #</th>
                <th>Wire Routing</th>
              </tr>
            </thead>
            <tbody>
              {data.flatMap((item) =>
                item.numbers.ach.map((n) => {
                  const account = item.accounts.find(
                    (a) => a.account_id === n.account_id,
                  );
                  return (
                    <tr key={n.account_id}>
                      <td>{item.institutionName ?? "—"}</td>
                      <td className="acct-mgr-name">
                        {account?.name ?? n.account_id.slice(0, 8)}
                        {account?.mask && (
                          <span className="acct-mgr-number">
                            {" "}
                            ···{account.mask}
                          </span>
                        )}
                      </td>
                      <td>
                        <code>{n.routing}</code>
                      </td>
                      <td>
                        <code>{n.account}</code>
                      </td>
                      <td>
                        {n.wire_routing ? <code>{n.wire_routing}</code> : "—"}
                      </td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
