export enum CoefficientCategory {
  STANDARD = "standard",
  CUSTOM = "custom",
}

// Info: (20260413 - Julian) 自訂係數的輸入，用於 DB 建立或編輯
export interface ICoefficientInput {
  name: string; // Info: (20260413 - Julian) 公式名稱
  description: string; // Info: (20260413 - Julian) 公式描述
  emissionFactor: number; // Info: (20260413 - Julian) 排放係數
  unit: string; // Info: (20260413 - Julian) 單位
  source: string; // Info: (20260413 - Julian) 公式來源
}

export interface ICoefficient extends ICoefficientInput {
  id: string;
  category: CoefficientCategory; // Info: (20260413 - Julian) 公式標籤：自訂、標準
  createdAt: number; // Info: (20260413 - Julian) 建立時間
  updatedAt: number; // Info: (20260413 - Julian) 更新時間
}
