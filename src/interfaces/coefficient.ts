export enum CoefficientCategory {
  STANDARD = "standard",
  CUSTOM = "custom",
}

// Info: (20260413 - Julian) 自訂係數的輸入，用於 DB 建立或編輯
export interface ICoefficientInput {
  name: string; // Info: (20260413 - Julian) 公式名稱
  description: string; // Info: (20260413 - Julian) 公式描述
  emissionFactor: string; // Info: (20260413 - Julian) 排放係數 (高精度防禦: 強制轉字串)
  unit: string; // Info: (20260413 - Julian) 單位
  source: string; // Info: (20260413 - Julian) 公式來源
  validFrom?: string | Date | null; // Info: (20260702 - Tzuhan) 係數生效日期
  validTo?: string | Date | null; // Info: (20260702 - Tzuhan) 係數失效日期
}

export interface ICoefficient extends ICoefficientInput {
  id: string;
  category: CoefficientCategory | string; // Info: (20260413 - Julian) 公式標籤：自訂、標準
  versionYear?: string | null; // Info: (20260514 - Tzuhan) 版本年份
  isVerified?: boolean; // Info: (20260514 - Tzuhan) CPA 防線
  createdAt: number; // Info: (20260413 - Julian) 建立時間
  updatedAt: number; // Info: (20260413 - Julian) 更新時間
}
