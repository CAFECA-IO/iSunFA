export enum CoefficientCategory {
  STANDARD = "standard",
  CUSTOM = "custom",
}

export interface ICoefficient {
  id: string;
  name: string; // Info: (20260413 - Julian) 公式名稱
  emissionFactor: number; // Info: (20260413 - Julian) 排放係數
  unit: string; // Info: (20260413 - Julian) 單位
  description: string; // Info: (20260413 - Julian) 公式描述
  source: string; // Info: (20260413 - Julian) 公式來源
  category: CoefficientCategory; // Info: (20260413 - Julian) 公式標籤：自訂、標準
  createdAt: number; // Info: (20260413 - Julian) 建立時間
  updatedAt: number; // Info: (20260413 - Julian) 更新時間
}

export const mockCoefficientList: ICoefficient[] = [
  {
    id: "1",
    name: "電力排放公式 (台灣 2023)",
    emissionFactor: 0.495,
    unit: "kWh",
    description: "根據經濟部能源署公布之電力排碳係數計算",
    source: "經濟部能源署",
    category: CoefficientCategory.STANDARD,
    createdAt: 1701388800,
    updatedAt: 1701388800,
  },
  {
    id: "2",
    name: "高鐵通勤公式",
    description: "國內高鐵每人公里排放係數",
    emissionFactor: 0.034,
    unit: "km",
    category: CoefficientCategory.STANDARD,
    source: "環保署",
    createdAt: 1701388800,
    updatedAt: 1758288800,
  },
  {
    id: "3",
    name: "自訂鋼鐵係數 (供應商 A)",
    emissionFactor: 1.85,
    unit: "kg",
    description: "供應商 A 提供之鋼鐵排放係數",
    source: "供應商 A",
    category: CoefficientCategory.CUSTOM,
    createdAt: 1701388800,
    updatedAt: 1724288800,
  },
  {
    id: "4",
    name: "自訂通勤公式 (供應商 B)",
    emissionFactor: 2.23,
    unit: "km",
    description: "供應商 B 提供之通勤排放係數",
    source: "供應商 B",
    category: CoefficientCategory.CUSTOM,
    createdAt: 1701388800,
    updatedAt: 1736388800,
  },
];