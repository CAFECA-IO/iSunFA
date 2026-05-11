import {
  getChunghwaTelecomVoucherLines,
  IExtractedData,
} from "@/services/rules/telecom_vendor_rules";

// Info: (20260511 - Tzuhan) Stage 2 黃金廠商映射註冊表 (Strategy Registry)
// 確保未來擴充廠商時符合 OCP 開閉原則
export const VENDOR_RULE_REGISTRY: Record<
  string,
  (extracted: IExtractedData) => unknown
> = {
  中華電信: getChunghwaTelecomVoucherLines,
};
