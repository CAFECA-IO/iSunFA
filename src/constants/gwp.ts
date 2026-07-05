/**
 * Info: (20260705 - Luphia)
 * IPCC Fifth Assessment Report (AR5) - 2014
 * GWP values for 100-year time horizon
 */
export const IPCC_AR5_GWP_100: Record<string, number> = {
  CO2: 1,
  // Info: (20260705 - Luphia) Methane values depend on fossil vs non-fossil origin
  CH4: 28, // Info: (20260705 - Luphia) Non-fossil (biogenic) as default
  CH4_FOSSIL: 30,
  N2O: 265,
  NF3: 16100,
  SF6: 23500,

  // Info: (20260705 - Luphia) HFCs
  "HFC-23": 12400,
  "HFC-32": 675,
  "HFC-41": 92,
  "HFC-125": 3170,
  "HFC-134": 1100,
  "HFC-134a": 1300,
  "HFC-143": 353,
  "HFC-143a": 4800,
  "HFC-152": 16,
  "HFC-152a": 138,
  "HFC-161": 4,
  "HFC-227ea": 3350,
  "HFC-236cb": 1210,
  "HFC-236ea": 1330,
  "HFC-236fa": 8060,
  "HFC-245ca": 716,
  "HFC-245fa": 858,
  "HFC-365mfc": 804,
  "HFC-43-10mee": 1650,

  // Info: (20260705 - Luphia) PFCs
  CF4: 6630,
  "PFC-14": 6630,
  C2F6: 11100,
  "PFC-116": 11100,
  C3F8: 8900,
  "PFC-218": 8900,
  "c-C4F8": 9540,
  C4F10: 9200,
  "PFC-31-10": 9200,
  C5F12: 8550,
  "PFC-41-12": 8550,
  C6F14: 7910,
  "PFC-51-14": 7910,
  C10F18: 7190,

  // Info: (20260705 - Luphia) Other gases
  CH3CCl3: 161,
  CCl4: 1730,
  CH3Br: 2,
  CH3Cl: 12,

  // Info: (20260705 - Luphia) Proxies for grouped reporting
  HFCs: 1300, // Info: (20260705 - Luphia) HFC-134a as proxy
  PFCs: 6630, // Info: (20260705 - Luphia) CF4 as proxy
};

/**
 * Info: (20260705 - Luphia)
 * IPCC Sixth Assessment Report (AR6) - 2021
 * GWP values for 100-year time horizon
 */
export const IPCC_AR6_GWP_100: Record<string, number> = {
  CO2: 1,
  // Info: (20260705 - Luphia) Methane values in AR6 vary by origin and feedback inclusion
  CH4: 27.9, // Info: (20260705 - Luphia) Default value often used in SPM
  CH4_FOSSIL: 29.8,
  CH4_NON_FOSSIL: 27.2,
  N2O: 273,
  NF3: 17400,
  SF6: 24300,

  // Info: (20260705 - Luphia) HFCs
  "HFC-23": 14600,
  "HFC-32": 771,
  "HFC-41": 105,
  "HFC-125": 3740,
  "HFC-134": 1130,
  "HFC-134a": 1530,
  "HFC-143": 361,
  "HFC-143a": 5810,
  "HFC-152": 17,
  "HFC-152a": 164,
  "HFC-161": 4,
  "HFC-227ea": 3600,
  "HFC-236cb": 1270,
  "HFC-236ea": 1390,
  "HFC-236fa": 8690,
  "HFC-245ca": 748,
  "HFC-245fa": 962,
  "HFC-365mfc": 904,
  "HFC-43-10mee": 1600,

  // Info: (20260705 - Luphia) PFCs
  CF4: 7380,
  "PFC-14": 7380,
  C2F6: 12400,
  "PFC-116": 12400,
  C3F8: 9290,
  "PFC-218": 9290,
  "c-C4F8": 10200,
  C4F10: 10000,
  "PFC-31-10": 10000,
  C5F12: 9220,
  "PFC-41-12": 9220,
  C6F14: 8620,
  "PFC-51-14": 8620,
  C10F18: 7530,

  // Info: (20260705 - Luphia) Other gases
  CH3CCl3: 161,
  CCl4: 1730,
  CH3Br: 2,
  CH3Cl: 12,

  // Info: (20260705 - Luphia) Proxies for grouped reporting
  HFCs: 1530, // Info: (20260705 - Luphia) HFC-134a as proxy
  PFCs: 7380, // Info: (20260705 - Luphia) CF4 as proxy
};

export const DEFAULT_GWP_VERSION = "IPCC_AR6";
