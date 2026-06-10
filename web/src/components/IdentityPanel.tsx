import { useQuery } from "@tanstack/react-query";
import { getMyIdentity } from "../api/plaid";

export function IdentityPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["plaid", "identity"],
    queryFn: getMyIdentity,
    retry: 1,
  });

  return (
    <div className="acct-mgr-card">
      <div className="acct-mgr-header">
        <div className="acct-mgr-header-left">
          <span className="section-title">Account Holder Identity</span>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading identity data…</p>
        </div>
      ) : error ? (
        <div className="alert alert-error">
          Identity product is not enabled on this Item.
        </div>
      ) : !data || data.length === 0 ? (
        <div className="acct-mgr-empty">No identity data available.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {data.map((item) => (
            <div key={item.itemId}>
              <div style={{ fontWeight: 600, marginBottom: ".5rem" }}>
                {item.institutionName ?? item.itemId}
              </div>
              {item.accounts.flatMap((acc) =>
                acc.owners.map((owner, i) => (
                  <div
                    key={`${acc.account_id}-${i}`}
                    style={{
                      padding: ".75rem 1rem",
                      borderTop: "1px solid var(--border)",
                      fontSize: ".875rem",
                    }}
                  >
                    <div>
                      <strong>Names:</strong> {owner.names.join(", ") || "—"}
                    </div>
                    {owner.emails.length > 0 && (
                      <div>
                        <strong>Emails:</strong>{" "}
                        {owner.emails.map((e) => e.data).join(", ")}
                      </div>
                    )}
                    {owner.phone_numbers.length > 0 && (
                      <div>
                        <strong>Phones:</strong>{" "}
                        {owner.phone_numbers.map((p) => p.data).join(", ")}
                      </div>
                    )}
                    {owner.addresses.length > 0 && (
                      <div>
                        <strong>Addresses:</strong>{" "}
                        {owner.addresses
                          .map(
                            (a) =>
                              `${a.data.street ?? ""}, ${a.data.city ?? ""}, ${a.data.region ?? ""} ${a.data.postal_code ?? ""}`,
                          )
                          .join(" / ")}
                      </div>
                    )}
                  </div>
                )),
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
