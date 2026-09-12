import { ALL_COEFFICIENTS } from "@/constants/true_esg_coefficients";
import { MOCK_EEIO_COEFFICIENTS } from "@/constants/mock_eeio_coefficients";

/**
 * Info: (20260907 - Luphia) 排放係數字典的**任務快照**（PR #6650 的收尾）。
 *
 * 外部運算節點依 `async_workers/00_async_worker_overview.md` 不得存取主資料庫，
 * 而 mission 管線需要係數字典——這是拆分後僅剩的兩條 DB 耦合
 *（`esg_parsing.getAllGlobalCoefficients` 與 `orchestrator.getCoefficientById`）。
 *
 * 三條出路（known_issues/executor_settings_isolation.md）裡選了「發包端預先
 * 解析」的變體：跨界通道只有 IPFS 與區塊鏈（shared-nothing，無共用磁碟、
 * 無內部 HTTP），所以字典由 **MissionIssuer**（維運側、有 DB）在發包時嵌進
 * `mission.json` 的 `prerequisiteData.globalCoefficients`，隨既有的 IPFS 通道
 * 過界；本模組是運算側的讀取端。
 *
 * **係數凍結於發包時點**是刻意的，不是妥協：資金在同一時點託管（Escrow），
 * 而同一份 mission 永遠以同一套係數計算，正是審計要的可重放性——係數字典
 * 是年度性的參照資料，跨日長任務用「排入當下」的值本來就是對的語意。
 *
 * 本模組**必須保持零 prisma**：它活在運算節點的匯入圖裡，
 * `worker_node_isolation.test.ts` 掃匯入圖釘住這件事。
 */

/**
 * Info: (20260907 - Luphia) 過界的線上形狀。`emissionFactor` 一律字串：
 * 資料庫側是 `Prisma.Decimal`，JSON 化成 number 會踩浮點（CLAUDE.md §2 的
 * Precision First），發包端序列化時就轉字串，與 `getCoefficientById` 回傳
 * DB 列時的行為一致。
 */
export interface ISnapshotCoefficient {
  id: string;
  name: string;
  description: string;
  unit: string;
  emissionFactor: string;
  source: string;
  category?: string;
  ghgFactors?: unknown;
}

/**
 * Info: (20260907 - Luphia) 發包端把 DB 列轉成線上形狀的**唯一**序列化器：
 * `issue.service`（生產發包）與 `e2e_seeder/phase2_runner`（準確率測試）共用，
 * 兩處各寫一份的話形狀遲早分岔。參數用結構型別而不是 Prisma 型別——
 * 本模組活在運算節點的匯入圖裡，必須保持零 prisma；`emissionFactor` 只要求
 * `toString()`（`Prisma.Decimal` 與字串都滿足）。
 */
export const serializeGlobalCoefficients = (
  rows: Array<{
    id: string;
    name: string;
    description: string | null;
    unit: string;
    emissionFactor: { toString(): string };
    source: string;
    category: string | null;
    ghgFactors: unknown;
  }>,
): ISnapshotCoefficient[] =>
  rows.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description || "",
    unit: c.unit,
    emissionFactor: c.emissionFactor.toString(),
    source: c.source,
    category: c.category ?? undefined,
    ghgFactors: c.ghgFactors,
  }));

const isSnapshotCoefficient = (
  value: unknown,
): value is ISnapshotCoefficient => {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    c.id.length > 0 &&
    typeof c.name === "string" &&
    typeof c.unit === "string" &&
    typeof c.emissionFactor === "string" &&
    typeof c.source === "string"
  );
};

/**
 * Info: (20260907 - Luphia) 從 mission 資料讀出全球係數快照。
 *
 * 缺席回空陣列而不是拋錯：快照通道上線前發出、還在管線裡的舊 mission
 * 沒有這個欄位，讓它們以「只有靜態字典」繼續走完（與快照通道出現**之前**
 * 的行為差異只剩 DB 自訂係數不參與——那正是舊 mission 發包當下不存在的
 * 資訊）。**逐筆**過濾壞形狀而不是整包丟棄：mission.json 走 IPFS 過界，
 * 內容視為不可信輸入，一筆壞資料不該讓整份字典消失。
 */
export const parseGlobalCoefficientSnapshot = (
  missionData: Record<string, unknown>,
): ISnapshotCoefficient[] => {
  const prerequisite = missionData.prerequisiteData;
  if (typeof prerequisite !== "object" || prerequisite === null) return [];
  const raw = (prerequisite as Record<string, unknown>).globalCoefficients;
  if (!Array.isArray(raw)) return [];
  return raw.filter(isSnapshotCoefficient);
};

/**
 * Info: (20260907 - Luphia) 合併靜態字典與快照，快照優先——與拆分前
 * `esg_parsing` 的合併順序（DB takes precedence）逐字相同，也與
 * `EmissionFactorRepo.getCoefficientById` 的「靜態先、DB 後」在**單筆查詢**
 * 上等價：id 撞號時兩邊都是後者贏。
 */
export const buildCoefficientDictionary = (
  snapshot: ISnapshotCoefficient[],
): Map<string, ISnapshotCoefficient> => {
  const dictionary = new Map<string, ISnapshotCoefficient>();
  [...ALL_COEFFICIENTS, ...MOCK_EEIO_COEFFICIENTS].forEach((c) => {
    dictionary.set(c.id, {
      id: c.id,
      name: c.name,
      description: c.description || "",
      unit: c.unit,
      emissionFactor: String(c.emissionFactor),
      source: c.source,
      category: c.category || "STANDARD",
      ghgFactors: (c as Record<string, unknown>).ghgFactors,
    });
  });
  snapshot.forEach((c) => dictionary.set(c.id, c));
  return dictionary;
};
