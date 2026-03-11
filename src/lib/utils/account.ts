import { ACCOUNTS, IAccount } from "@/constants/accounts";

/**
 *  Info: (20260311 - Julian) 從 accounting code 找到會計科目
 */
export function getAccountByCode(code: string | number): IAccount | null {
  if (!code) {
    return null;
  }
  // Info: (20260311 - Julian) 目前以 TW 為主
  const result = ACCOUNTS.TW.find((acc) => acc.code === code) || null;
  return result;
}
