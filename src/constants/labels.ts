import { CountryCode } from "@/constants/enums";

// Info: (20260601 - Tzuhan) 集中管理系統產生的所有顯示文案/標籤，避免 Hardcode

export const SystemLabels = {
  PREPAID_PREFIX: {
    [CountryCode.TW]: "[預付]",
    [CountryCode.US]: "[Prepaid]",
    [CountryCode.CN]: "[预付]",
    [CountryCode.KR]: "[선급]",
    [CountryCode.JP]: "[前払]",
    [CountryCode.HK]: "[預付]",
    [CountryCode.EU]: "[Prepaid]",
    DEFAULT: "[Prepaid]",
  },
  AMORTIZATION_POSTFIX: {
    [CountryCode.TW]: "攤銷",
    [CountryCode.US]: "Amortization",
    [CountryCode.CN]: "摊销",
    [CountryCode.KR]: "상각",
    [CountryCode.JP]: "償却",
    [CountryCode.HK]: "攤銷",
    [CountryCode.EU]: "Amortization",
    DEFAULT: "Amortization",
  },
} as const;

export type LabelGroup = keyof typeof SystemLabels;

export function getLabel(
  labelGroup: LabelGroup,
  countryCode: CountryCode | string,
): string {
  const group = SystemLabels[labelGroup];
  if (countryCode in group) {
    return group[countryCode as keyof typeof group];
  }
  return group.DEFAULT;
}
