export const IPCC_AR6_GWP_100: Record<string, number> = {
  CO2: 1,
  CH4: 27.9,
  N2O: 273,
  NF3: 17400,
  SF6: 24300,
  /** Info: (20260630 - Tzuhan) Grouped baseline for common HFCs/PFCs if not fully specified,
   * or they can be matched exactly (e.g. "HFC-32": 771) if we expand further.
   */
  HFCs: 1430, // Info: (20260630 - Tzuhan) HFC-134a as proxy if unspecified
  PFCs: 7390, // Info: (20260630 - Tzuhan) CF4 as proxy if unspecified
  "HFC-32": 771,
  "HFC-134a": 1430,
};

export const DEFAULT_GWP_VERSION = "IPCC_AR6";
