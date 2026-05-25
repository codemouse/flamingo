import client from "./client";
import type { YodleeAccount, YodleeTransaction } from "../types/yodlee";

export const getMyAccounts = () =>
  client.get<YodleeAccount[]>("/yodlee/me/accounts").then((r) => r.data);

export const getMyTransactions = (params?: {
  fromDate?: string;
  toDate?: string;
  top?: string;
}) =>
  client
    .get<YodleeTransaction[]>("/yodlee/me/transactions", { params })
    .then((r) => r.data);

export const getMyFastLinkToken = () =>
  client
    .get<{ accessToken: string; fastLinkUrl: string }>("/yodlee/me/token")
    .then((r) => r.data);

export const updateMyAccount = (
  accountId: number,
  payload: { nickname?: string },
) =>
  client.patch(`/yodlee/me/accounts/${accountId}`, payload).then((r) => r.data);

export const deleteMyAccount = (accountId: number) =>
  client.delete(`/yodlee/me/accounts/${accountId}`);
