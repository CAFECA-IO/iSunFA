import { KR_ACCOUNTS } from "@/constants/accounts/kr";
import { US_ACCOUNTS } from "@/constants/accounts/us";
import { JP_ACCOUNTS } from "@/constants/accounts/jp";
import { CN_ACCOUNTS } from "@/constants/accounts/cn";
import { HK_ACCOUNTS } from "@/constants/accounts/hk";
import { TW_ACCOUNTS } from "@/constants/accounts/tw";

export interface IAccount {
  code: string;
  name: string;
  description: string;
  type: string;
  level: number;
  parentCode: string;
  debit: boolean;
}

export const COUNTRY = {
  CN: 'CN',
  HK: 'HK',
  JP: 'JP',
  KR: 'KR',
  TW: 'TW',
  US: 'US',
}

export const RULE = {
  IFRS: 'IFRS',
  HKFRS: 'HKFRS',
  K_IFRS: 'K-IFRS',
  T_IFRS: 'T-IFRS',
  ASBE: 'ASBE',
  JMIS: 'JMIS',
  US_GAAP: 'US-GAAP',
  J_GAAP: 'J-GAAP',
}

export const DEFAULT_RULE = {
  [COUNTRY.CN]: RULE.ASBE,
  [COUNTRY.HK]: RULE.HKFRS,
  [COUNTRY.JP]: RULE.JMIS,
  [COUNTRY.KR]: RULE.K_IFRS,
  [COUNTRY.TW]: RULE.T_IFRS,
  [COUNTRY.US]: RULE.US_GAAP,
}

export const ACCOUNTS = {
  CN: CN_ACCOUNTS,
  HK: HK_ACCOUNTS,
  JP: JP_ACCOUNTS,
  KR: KR_ACCOUNTS,
  TW: TW_ACCOUNTS,
  US: US_ACCOUNTS,
};