import { EsgIntensity, EsgScope } from "@/interfaces/esg";

export interface IEmissionSources {
  id: string;
  name: string;
  address: string;
  intensity: EsgIntensity; // Info: (20260421 - Julian) 排放強度分類 (LOW, MEDIUM, HIGH)
}

export interface IMockEsgRecord {
  id: string;
  timestamp: number;
  activityType: string;
  vendor: string;
  amount: number;
  unit: string;
  emissions: number;
  emissionSourceTag?: string;
}

export interface IEsgEmissionSourcesUI extends IEmissionSources {
  records: IMockEsgRecord[];
  totalEmission: number;
}

export interface IEsgEmissionSourcesSummary {
  totalEmissionSourcesCount: number;
  estimatedAnnualTotalEmission: number;
  top3EmissionSources: {
    name: string;
    value: number;
  }[];
  scopeDistribution: {
    scope: EsgScope;
    count: number;
  }[];
}
export const mockEmissionSources: IEsgEmissionSourcesUI[] = [
  {
    id: "CSC-HQ-001",
    name: "中鋼公司高雄小港廠",
    address: "高雄市小港區中鋼路1號",
    intensity: EsgIntensity.HIGH,
     records: [
      {
        id: "rec-001",
        timestamp: 1713168000,
        activityType: "燃料燃燒",
        vendor: "台灣中油",
        amount: 1500,
        unit: "公秉",
        emissions: 2310.5,
        emissionSourceTag: "一號鍋爐"
      },
      {
        id: "rec-002",
        timestamp: 1713168000,
        activityType: "電力使用",
        vendor: "台灣電力公司",
        amount: 800,
        unit: "度",
        emissions: 405.6,
        emissionSourceTag: "一號鍋爐"
      },
      {
        id: "rec-003",
        timestamp: 1713254400,
        activityType: "燃料燃燒",
        vendor: "自產煤氣",
        amount: 3200,
        unit: "千立方公尺",
        emissions: 1530.2,
        emissionSourceTag: "熱軋產線"
      },
      {
        id: "rec-004",
        timestamp: 1713340800,
        activityType: "柴油發電機",
        vendor: "台塑石化",
        amount: 300,
        unit: "公升",
        emissions: 790.2,
      }
    ],
    totalEmission: 5036.5,
  },
  {
    id: "DSC-TC-002",
    name: "中龍鋼鐵龍井廠",
    address: "台中市龍井區龍昌路100號",
    intensity: EsgIntensity.HIGH,
    records: [
      {
        id: "rec-005",
        timestamp: 1713168000,
        activityType: "煤炭燃燒",
        vendor: "進口無煙煤",
        amount: 45000,
        unit: "噸",
        emissions: 102500.5,
        emissionSourceTag: "二號高爐"
      },
      {
        id: "rec-006",
        timestamp: 1713427200,
        activityType: "電力使用",
        vendor: "台灣電力公司",
        amount: 92000,
        unit: "千度",
        emissions: 45540.0,
        emissionSourceTag: "電弧爐"
      }
    ],
    totalEmission: 148040.5,
  },
  {
    id: "CHSC-KS-003",
    name: "中鴻鋼鐵岡山廠",
    address: "高雄市岡山區本工路1號",
    intensity: EsgIntensity.MEDIUM,
    records: [
      {
        id: "rec-007",
        timestamp: 1713168000,
        activityType: "一般電力",
        vendor: "台灣電力公司",
        amount: 4500,
        unit: "千度",
        emissions: 2227.5,
        emissionSourceTag: "冷軋線"
      },
      {
        id: "rec-008",
        timestamp: 1713513600,
        activityType: "天然氣燃燒",
        vendor: "台灣中油",
        amount: 210,
        unit: "千立方公尺",
        emissions: 450.8,
        emissionSourceTag: "空調系統"
      }
    ],
    totalEmission: 2678.3,
  },
  {
    id: "CSVC-VN-004",
    name: "中鋼日鐵越南公司 (CSVC)",
    address: "越南巴地頭頓省美春A2工業區",
    intensity: EsgIntensity.MEDIUM,
    records: [
      {
        id: "rec-009",
        timestamp: 1713168000,
        activityType: "工業電力",
        vendor: "越南國家電力局 (EVN)",
        amount: 11200,
        unit: "千度",
        emissions: 8064.0,
        emissionSourceTag: "連續退火線"
      },
      {
        id: "rec-010",
        timestamp: 1713600000,
        activityType: "柴油燃燒",
        vendor: "Petrolimex",
        amount: 1500,
        unit: "公升",
        emissions: 3995.5,
      }
    ],
    totalEmission: 12059.5,
  },
  {
    id: "CSCC-KS-005",
    name: "中鋼碳素高雄廠",
    address: "高雄市小港區中林路25號",
    intensity: EsgIntensity.MEDIUM,
    records: [
      {
        id: "rec-011",
        timestamp: 1713168000,
        activityType: "蒸汽使用",
        vendor: "中鋼公司",
        amount: 850,
        unit: "噸",
        emissions: 2210.0,
        emissionSourceTag: "精餾塔"
      },
      {
        id: "rec-012",
        timestamp: 1713686400,
        activityType: "一般電力",
        vendor: "台灣電力公司",
        amount: 3200,
        unit: "千度",
        emissions: 1584.0,
        emissionSourceTag: "瀝青加工線"
      }
    ],
    totalEmission: 3794.0,
  },
  {
    id: "CSSC-YC-006",
    name: "中鋼結構燕巢廠",
    address: "高雄市燕巢區四林路300號",
    intensity: EsgIntensity.LOW,
    records: [
      {
        id: "rec-013",
        timestamp: 1713168000,
        activityType: "銲條材料",
        vendor: "天泰銲材",
        amount: 120,
        unit: "公斤",
        emissions: 32.5,
        emissionSourceTag: "自動銲接區"
      },
      {
        id: "rec-014",
        timestamp: 1713772800,
        activityType: "一般電力",
        vendor: "台灣電力公司",
        amount: 450,
        unit: "千度",
        emissions: 222.7,
        emissionSourceTag: "自動銲接區"
      }
    ],
    totalEmission: 255.2,
  },
  {
    id: "CSAL-KS-007",
    name: "中鋼鋁業小港廠",
    address: "高雄市小港區中工路17號",
    intensity: EsgIntensity.MEDIUM,
    records: [
      {
        id: "rec-015",
        timestamp: 1713168000,
        activityType: "天然氣燃燒",
        vendor: "台灣中油",
        amount: 520,
        unit: "千立方公尺",
        emissions: 1092.5,
        emissionSourceTag: "熔鋁爐"
      },
      {
        id: "rec-016",
        timestamp: 1713859200,
        activityType: "電力使用",
        vendor: "台灣電力公司",
        amount: 2100,
        unit: "千度",
        emissions: 1039.5,
        emissionSourceTag: "熱軋線"
      }
    ],
    totalEmission: 2132.0,
  },
  {
    id: "CSCI-IN-008",
    name: "中鋼印度公司 (CSCI)",
    address: "印度古吉拉特邦 Bharuch 縣",
    intensity: EsgIntensity.LOW,
    records: [
      {
        id: "rec-017",
        timestamp: 1713168000,
        activityType: "電力使用",
        vendor: "MGVCL",
        amount: 1850,
        unit: "千度",
        emissions: 1480.0,
        emissionSourceTag: "冷軋退火線"
      },
      {
        id: "rec-018",
        timestamp: 1713945600,
        activityType: "公務車柴油用量",
        vendor: "Indian Oil",
        amount: 450,
        unit: "公升",
        emissions: 1195.8,
      }
    ],
    totalEmission: 2675.8,
  }
];