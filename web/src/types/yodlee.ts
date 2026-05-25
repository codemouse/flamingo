export interface YodleeAmount {
  currency: string;
  amount: number;
}

export interface YodleeAccount {
  id: number;
  container: "bank" | "creditCard" | "investment" | "loan" | string;
  accountName: string;
  accountStatus: string;
  accountNumber: string;
  accountType: string;
  providerName: string;
  balance: YodleeAmount;
  isAsset: boolean;
  availableBalance?: YodleeAmount;
  currentBalance?: YodleeAmount;
  availableCredit?: YodleeAmount;
  totalCreditLine?: YodleeAmount;
  runningBalance?: YodleeAmount;
  totalCashLimit?: YodleeAmount;
  lastPaymentAmount?: YodleeAmount;
  lastPaymentDate?: string;
  apr?: number;
  displayedName?: string;
  lastUpdated: string;
  userClassification?: string;
}

export interface YodleeTransaction {
  id: number;
  amount: YodleeAmount;
  categoryType?: string;
  category?: string;
  description?: { original?: string; consumer?: string };
  transactionDate: string;
  postDate?: string;
  accountId: number;
  type?: "CREDIT" | "DEBIT";
  status?: string;
  merchant?: { name?: string };
}
