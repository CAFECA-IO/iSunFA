import { KR_ACCOUNTS } from "@/constants/accounts/kr";
import { US_ACCOUNTS } from "@/constants/accounts/us";
import { JP_ACCOUNTS } from "@/constants/accounts/jp";
import { CN_ACCOUNTS } from "@/constants/accounts/cn";
import { HK_ACCOUNTS } from "@/constants/accounts/hk";
import { TW_ACCOUNTS } from "@/constants/accounts/tw";
import { EU_ACCOUNTS } from "@/constants/accounts/eu";
import { CountryCode } from "@/constants/enums";

export interface IAccount {
  code: string;
  name: string;
  description: string;
  type: string;
  level: number;
  parentCode: string;
  isDebit: boolean;
  isInterestBearing?: boolean;
  isDividend?: boolean;
  aliases?: string[];
}

export const CURRENCY = {
  CN: "CNY",
  HK: "HKD",
  JP: "JPY",
  KR: "KRW",
  TW: "TWD",
  US: "USD",
  EU: "EUR",
};

export const RULE = {
  IFRS: "IFRS",
  HKFRS: "HKFRS",
  K_IFRS: "K-IFRS",
  T_IFRS: "T-IFRS",
  ASBE: "ASBE",
  JMIS: "JMIS",
  US_GAAP: "US-GAAP",
  J_GAAP: "J-GAAP",
  IFRS_EU: "IFRS-EU",
};

export const DEFAULT_RULE = {
  [CountryCode.CN]: RULE.ASBE,
  [CountryCode.HK]: RULE.HKFRS,
  [CountryCode.JP]: RULE.JMIS,
  [CountryCode.KR]: RULE.K_IFRS,
  [CountryCode.TW]: RULE.T_IFRS,
  [CountryCode.US]: RULE.US_GAAP,
  [CountryCode.EU]: RULE.IFRS_EU,
};

export const ACCOUNTS = {
  CN: CN_ACCOUNTS,
  HK: HK_ACCOUNTS,
  JP: JP_ACCOUNTS,
  KR: KR_ACCOUNTS,
  TW: TW_ACCOUNTS,
  US: US_ACCOUNTS,
  EU: EU_ACCOUNTS,
};
