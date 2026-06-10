import type { PlaidAccount } from "../types/plaid";
import { AccountCard } from "./AccountCard";

interface Props {
  accounts: PlaidAccount[];
}

function Section({
  title,
  accounts,
}: {
  title: string;
  accounts: PlaidAccount[];
}) {
  if (accounts.length === 0) return null;
  return (
    <div className="accounts-section">
      <h3 className="accounts-section-title">{title}</h3>
      <div className="accounts-grid">
        {accounts.map((a) => (
          <AccountCard key={a.account_id} account={a} />
        ))}
      </div>
    </div>
  );
}

export function AccountsGrid({ accounts }: Props) {
  const depository = accounts.filter((a) => a.type === "depository");
  const credit = accounts.filter((a) => a.type === "credit");
  const others = accounts.filter(
    (a) => a.type !== "depository" && a.type !== "credit",
  );

  return (
    <div className="accounts-sections">
      <Section title="Bank Accounts" accounts={depository} />
      <Section title="Credit Cards" accounts={credit} />
      <Section title="Other Accounts" accounts={others} />
    </div>
  );
}
