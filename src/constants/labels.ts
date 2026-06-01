// Info: (20260601 - Tzuhan) 集中管理系統產生的所有顯示文案/標籤，避免 Hardcode

export const SystemLabels = {
  PREPAID_PREFIX: {
    TW: "[預付]",
    US: "[Prepaid]",
    CN: "[预付]",
    KR: "[선급]",
    JP: "[前払]",
    DEFAULT: "[Prepaid]",
  },
  AMORTIZATION_POSTFIX: {
    TW: "攤銷",
    US: "Amortization",
    CN: "摊销",
    KR: "상각",
    JP: "償却",
    DEFAULT: "Amortization",
  },
} as const;

export type LabelCountryCode = keyof typeof SystemLabels.PREPAID_PREFIX;

export function getLabel(
  labelGroup: keyof typeof SystemLabels,
  countryCode: string,
): string {
  const group = SystemLabels[labelGroup];
  return group[countryCode] || group.DEFAULT;
}
