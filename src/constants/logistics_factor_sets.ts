// Info: (20260801 - Luphia) 物流碳足跡的排放係數組。
//
// Info: (20260801 - Luphia) 為什麼是「組」而非單一常數:同一段運輸依採用的係數來源不同,
// Info: (20260801 - Luphia) 申報值可差近一倍(實測 R02 東京→巴黎:DEFRA 5,856 kg vs 環境部 11,276 kg)。
// Info: (20260801 - Luphia) 使用者必須能選擇適用的來源,而報告必須揭露選了哪一組。

/**
 * Info: (20260801 - Luphia) 係數組。預設為環境部 —— 本系統的主要使用者在臺灣申報,
 * 主管機關收錄的係數優先於境外機構。
 */
export enum FactorSetEnum {
  /** Info: (20260801 - Luphia) 環境部產品碳足跡資訊網 */
  MOENV = "MOENV",
  /** Info: (20260801 - Luphia) UK DEFRA 2025 Freighting goods */
  DEFRA = "DEFRA",
}

export const DEFAULT_FACTOR_SET = FactorSetEnum.MOENV;

/**
 * Info: (20260801 - Luphia) 單一模式的係數與其出處。
 *
 * **region 與 announcedYear 不是裝飾欄位,是必須印在報告上的資訊。**
 * 環境部產品碳足跡資訊網收錄的海運與空運係數,生產區域是**美國**、公告年份為
 * 2016 / 2017 —— 那是環境部收錄的境外資料集,不是臺灣自行推導的係數。
 * 只寫「環境部」會讓查核者誤以為那是臺灣本土係數,故來源字串一律含區域與年份。
 */
export interface IEmissionFactorEntry {
  /**
   * Info: (20260801 - Luphia) 對應 true_esg_coefficients 的條目 id。
   * 由 logistics_factor_sets.test.ts 據此斷言 factor 與 source 一致 ——
   * 數值在此重打一次是為了避免前端為了三個係數而載入 1,293 筆係數庫,
   * 但重打就有漂移風險,故以測試把兩邊綁在一起。
   */
  coefficientId: string;
  /** Info: (20260801 - Luphia) kg CO2e / t-km,以字串保存以免浮點格式化誤差 */
  factor: string;
  /** Info: (20260801 - Luphia) 係數在原始資料集中的品項名稱 */
  itemName: string;
  /** Info: (20260801 - Luphia) 發布或收錄機構 */
  publisher: string;
  /** Info: (20260801 - Luphia) 生產區域;DEFRA 未標示區域時為 undefined */
  region?: string;
  /** Info: (20260801 - Luphia) 公告年份;DEFRA 以版本年份表示於 publisher */
  announcedYear?: string;
}

export type IFactorSet = Record<"LAND" | "SEA" | "AIR", IEmissionFactorEntry>;

/**
 * Info: (20260801 - Luphia) 環境部組。
 *
 * 陸運取「營業大貨車(柴油)」:2022 年公告、生產區域臺灣,是資料集內最新的
 * 臺灣陸運貨運係數。同名的 2014 年版(0.235)不採用 —— 資料集內同名不同值,
 * 以公告年份區辨。
 *
 * 海運取「國際海運貨物運輸服務(燃料油動力)」、空運取「航空貨物運輸服務」。
 * **兩者的生產區域皆為美國**,且空運只有單一未區分航程的通用值
 * (DEFRA 另分國內／短程／長程)。此限制記於方法論說明的已知限制節。
 */
const MOENV_FACTOR_SET: IFactorSet = {
  LAND: {
    coefficientId: "43d3d7d2-65f4-47ab-a3e9-eafc153cdeb3",
    factor: "0.131",
    itemName: "營業大貨車(柴油)",
    publisher: "環境部產品碳足跡資訊網",
    region: "臺灣",
    announcedYear: "2022",
  },
  SEA: {
    coefficientId: "0957acfa-f0e4-4e10-afdb-42a6b1e9eb58",
    factor: "0.0198",
    itemName: "國際海運貨物運輸服務(燃料油動力)",
    publisher: "環境部產品碳足跡資訊網",
    region: "美國",
    announcedYear: "2016",
  },
  AIR: {
    coefficientId: "352ba02b-53cc-4094-a2ed-f4ba069908d6",
    factor: "1.16",
    itemName: "航空貨物運輸服務",
    publisher: "環境部產品碳足跡資訊網",
    region: "美國",
    announcedYear: "2017",
  },
};

/**
 * Info: (20260801 - Luphia) DEFRA 2025 組。保留為可選 ——
 * 空運分航程(此處取長程國際)、係數年份較新,對境外為主的路線仍是合理選擇。
 */
const DEFRA_FACTOR_SET: IFactorSet = {
  LAND: {
    coefficientId: "defra-2025-frt-004",
    factor: "0.11289",
    itemName: "重型聯結車 (HGV) - 全鉸接式 (All artics) - 平均載重",
    publisher: "UK DEFRA 2025 - Freighting goods",
  },
  SEA: {
    coefficientId: "defra-2025-frt-006",
    factor: "0.01045",
    itemName: "平均貨櫃船 (Average container ship)",
    publisher: "UK DEFRA 2025 - Freighting goods",
  },
  AIR: {
    coefficientId: "defra-2025-frt-011",
    factor: "0.6023",
    itemName: "長程國際航空貨運 (Long-haul international)",
    publisher: "UK DEFRA 2025 - Freighting goods",
  },
};

export const LOGISTICS_FACTOR_SETS: Record<FactorSetEnum, IFactorSet> = {
  [FactorSetEnum.MOENV]: MOENV_FACTOR_SET,
  [FactorSetEnum.DEFRA]: DEFRA_FACTOR_SET,
};

/** Info: (20260801 - Luphia) 選單顯示順序:預設組列首 */
export const FACTOR_SET_ORDER = [
  FactorSetEnum.MOENV,
  FactorSetEnum.DEFRA,
] as const;

/**
 * Info: (20260801 - Luphia) 取用係數組。未指定或指定了未知值時退回預設 ——
 * 不 throw:係數組是顯示層的選擇,一個過期的請求不該讓整批匯出失敗。
 */
export function resolveFactorSet(setKey?: string): IFactorSet {
  const key = (setKey ?? "") as FactorSetEnum;
  return (
    LOGISTICS_FACTOR_SETS[key] ?? LOGISTICS_FACTOR_SETS[DEFAULT_FACTOR_SET]
  );
}

/**
 * Info: (20260801 - Luphia) 報告上的來源字串。**必須含區域與年份** ——
 * 只寫「環境部產品碳足跡資訊網」會讓查核者以為海空運是臺灣本土係數,
 * 而它們實為該網收錄的美國區域 2016 / 2017 資料。
 */
export function formatFactorSource(entry: IEmissionFactorEntry): string {
  const qualifiers = [
    entry.region,
    entry.announcedYear ? `${entry.announcedYear} 公告` : undefined,
  ]
    .filter(Boolean)
    .join("・");
  return qualifiers
    ? `${entry.publisher}（${entry.itemName}｜${qualifiers}）`
    : `${entry.publisher}（${entry.itemName}）`;
}

/**
 * Info: (20260801 - Luphia) 係數組的版本標籤,印在報告上供區分不同批次的產出。
 *
 * 為什麼需要:換係數組會讓同一條路線的申報值改變近一倍(實測 R02 為 1.93 倍)。
 * 已產出的舊報告與新報告若都只寫「本方案總排放 X kg」,查核者無法判斷兩份
 * 為何不同 —— 是資料改了、演算法改了,還是係數組換了。標籤讓這件事一眼可辨。
 *
 * 以「組代碼 + 各模式公告年份」構成而非另立版號:版號要人工維護且會忘記更新,
 * 而年份直接來自係數本身,換係數必然改變標籤。
 */
export function formatFactorSetVersion(
  setKey: FactorSetEnum,
  set: IFactorSet,
): string {
  const years = (["LAND", "SEA", "AIR"] as const)
    .map((mode) => set[mode].announcedYear)
    .filter((year): year is string => Boolean(year));
  // Info: (20260801 - Luphia) 去重後排序:三個模式常共用同一年份,重複列出沒有資訊量
  const uniqueYears = [...new Set(years)].sort();
  return uniqueYears.length > 0 ? `${setKey}/${uniqueYears.join("-")}` : setKey;
}

/**
 * Info: (20260801 - Luphia) 換組對總排放的影響。
 *
 * **刻意以實際段落試算而非給一個固定百分比。** 影響完全取決於路線組成:
 * 純陸運路線由 DEFRA 換到環境部只增加 16%,而以長程空運為主的路線增加 93%。
 * 給一個「約 ±X%」的通用數字會在半數情況下誤導使用者。
 *
 * 只用距離與模式,不碰既有的逐段排放值 —— 這是「若換組會怎樣」的假設試算,
 * 不是申報數值,故以原生 number 計算即可(申報值仍由後端以 Decimal 產生)。
 */
export interface IFactorSetImpact {
  setKey: FactorSetEnum;
  /** Info: (20260801 - Luphia) 該組下的總排放(kg CO2e);無可用段落時為 undefined */
  totalCo2eKg?: number;
}

export function compareFactorSetTotals(
  legs: { mode?: string; distanceKm?: number }[],
  weightKg: number,
): IFactorSetImpact[] {
  const tonnes = weightKg / 1000;
  const usable = legs.filter(
    (leg) =>
      (leg.mode === "LAND" || leg.mode === "SEA" || leg.mode === "AIR") &&
      Number.isFinite(Number(leg.distanceKm)),
  );

  return FACTOR_SET_ORDER.map((setKey) => {
    if (usable.length === 0 || !Number.isFinite(tonnes) || tonnes <= 0) {
      return { setKey };
    }
    const set = LOGISTICS_FACTOR_SETS[setKey];
    const total = usable.reduce((sum, leg) => {
      const entry = set[leg.mode as "LAND" | "SEA" | "AIR"];
      return sum + Number(leg.distanceKm) * tonnes * Number(entry.factor);
    }, 0);
    return { setKey, totalCo2eKg: total };
  });
}

/**
 * Info: (20260801 - Luphia) 相對於指定組的變化倍數。回 undefined 表示無從比較 ——
 * 不以 0 或 1 充數:1 會被讀成「沒有差異」,而事實是「算不出來」。
 */
export function factorSetDeltaRatio(
  impacts: IFactorSetImpact[],
  baseSetKey: FactorSetEnum,
  targetSetKey: FactorSetEnum,
): number | undefined {
  const base = impacts.find((impact) => impact.setKey === baseSetKey);
  const target = impacts.find((impact) => impact.setKey === targetSetKey);
  if (
    base?.totalCo2eKg === undefined ||
    target?.totalCo2eKg === undefined ||
    base.totalCo2eKg <= 0
  ) {
    return undefined;
  }
  return target.totalCo2eKg / base.totalCo2eKg;
}
