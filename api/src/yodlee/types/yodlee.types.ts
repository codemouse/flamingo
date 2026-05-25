/** Raw shapes from the Yodlee REST API — internal service use only */
export interface RawYodleeAmount {
  currency: string;
  amount: number;
}

export interface RawYodleeAccount {
  id: number;
  CONTAINER: string;
  accountName: string;
  accountStatus: string;
  accountNumber: string;
  accountType: string;
  providerName: string;
  balance: RawYodleeAmount;
  isAsset: boolean;
  availableBalance?: RawYodleeAmount;
  currentBalance?: RawYodleeAmount;
  availableCredit?: RawYodleeAmount;
  totalCreditLine?: RawYodleeAmount;
  runningBalance?: RawYodleeAmount;
  totalCashLimit?: RawYodleeAmount;
  lastPaymentAmount?: RawYodleeAmount;
  lastPaymentDate?: string;
  apr?: number;
  displayedName?: string;
  lastUpdated: string;
  userClassification?: string;
}

export interface RawYodleeTransaction {
  id: number;
  amount: RawYodleeAmount;
  categoryType?: string;
  category?: string;
  description?: { original?: string; consumer?: string };
  transactionDate: string;
  postDate?: string;
  accountId: number;
  type?: 'CREDIT' | 'DEBIT';
  status?: string;
  merchant?: { name?: string };
}

/** Normalized shapes returned to API clients */
export interface YodleeAmount {
  currency: string;
  amount: number;
}

export interface AccountDto {
  id: number;
  /** Normalized from Yodlee's all-caps CONTAINER field */
  container: string;
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

export interface TransactionDto {
  id: number;
  amount: YodleeAmount;
  categoryType?: string;
  category?: string;
  description?: { original?: string; consumer?: string };
  transactionDate: string;
  postDate?: string;
  accountId: number;
  type?: 'CREDIT' | 'DEBIT';
  status?: string;
  merchant?: { name?: string };
}
