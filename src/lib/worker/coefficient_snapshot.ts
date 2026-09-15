import Decimal from "decimal.js";
import { ALL_COEFFICIENTS } from "@/constants/true_esg_coefficients";
import { MOCK_EEIO_COEFFICIENTS } from "@/constants/mock_eeio_coefficients";
import { LEGACY_STANDARD_COEFFICIENT_CATEGORY } from "@/constants/esg";
import { MISSION_GLOBAL_COEFFICIENT_SNAPSHOT_MAX_BYTES } from "@/constants/worker_node";

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

/**
 * Info: (20260915 - Luphia) 「是有限的十進位數」——係數值的唯一判準（PR #6650
 * review 四輪需修-5）。第一版只查 `typeof === "string"`，`"0.509 kg"` 通得過，
 * 進 `MoneyUtil.toDecimal` 的 `catch { return new Decimal(0) }` 變成 0：ESG 紀錄寫
 * emissions = 0、mission 報成功、全鏈路零錯誤。CLAUDE.md §6 要求違反底層數學的
 * 輸入在最外層凍結——這裡就是快照的最外層。用 `decimal.js`（零 prisma）而不是
 * `Prisma.Decimal`：本模組活在運算節點的匯入圖裡。
 */
export const isFiniteDecimalString = (value: unknown): value is string => {
  if (typeof value !== "string" || value.trim() === "") return false;
  try {
    return new Decimal(value.trim()).isFinite();
  } catch {
    return false;
  }
};

/**
 * Info: (20260915 - Luphia) `ghgFactors` 缺席合法；出現時必須是「氣體 → 有限數」
 * 的純物件（`esg.calculator.service` 以 `String(factor)` 逐氣體乘）。壞值比壞
 * `emissionFactor` 更糟：算出總量 0 之外還多一份看起來很權威的逐氣體 breakdown。
 * 接受 `number`（靜態字典的形狀）與十進位字串（過 JSON 的形狀）。
 */
export const isValidGhgFactors = (value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(
    (factor) =>
      (typeof factor === "number" && Number.isFinite(factor)) ||
      isFiniteDecimalString(factor),
  );
};

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
    isFiniteDecimalString(c.emissionFactor) &&
    typeof c.source === "string" &&
    isValidGhgFactors(c.ghgFactors)
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
 * Info: (20260914 - Luphia) 租戶自訂係數也要進字典（review 需修-5）。
 *
 * `document.generator` 把 `prerequisiteData.coefficients`（租戶自訂）餵進 prompt
 * 當可選答案，而 `esg_parsing` turn 2 的 `coefficientId` 是自由字串——模型挑了
 * 租戶係數，只含全球＋靜態的字典就 miss，orchestrator 兩處 `if (coef)` 靜默跳過，
 * ESG 紀錄寫入時 `emissions` 是空的。改版前 `getCoefficientById` 的 `findUnique`
 * 沒有 accountBookId 過濾，租戶係數解得到——這裡把那半邊補回來。
 *
 * 形狀是 `ICoefficient`（esg.repo 的前端格式：`emissionFactor` 已是字串），
 * 與全球快照共用同一支型別守衛：讀取端只認一種線上形狀。
 */
export const parseTenantCoefficientSnapshot = (
  missionData: Record<string, unknown>,
): ISnapshotCoefficient[] => {
  const prerequisite = missionData.prerequisiteData;
  if (typeof prerequisite !== "object" || prerequisite === null) return [];
  const raw = (prerequisite as Record<string, unknown>).coefficients;
  if (!Array.isArray(raw)) return [];
  return raw.filter(isSnapshotCoefficient);
};

/**
 * Info: (20260914 - Luphia) 合併順序：靜態 < 全球快照 < 租戶——**資料庫的值贏**。
 *
 * ## 這是一個行為變更，不是等價改寫（review 需修-4；決定：Luphia，2026-09-14）
 *
 * 第一版註解宣稱「與 `getCoefficientById` 的靜態先、DB 後在單筆查詢上等價」，
 * **那是錯的**：靜態先＝靜態命中就 return、不查 DB＝**靜態贏**。而拆分前兩個
 * 消費端本來就不一致——`esg_parsing` 的合併是 DB 贏、`orchestrator` 的
 * `getCoefficientById` 是靜態贏；同一張傳票由前者選 id、後者算數，撞號時
 * 用的是兩個不同的值。
 *
 * 統一成 DB 贏的理由：admin 的 `carbon_emission_database/import` 就是拿
 * `ALL_COEFFICIENTS` 的保留 id 匯進 DB，`updateGlobal` 允許 admin 改
 * `emissionFactor`——若靜態贏，admin 修正官方係數對重跑的 mission **無效**，
 * 那個維護功能就是壞的。代價：撞號 id 的舊 mission 重跑會得到新值；
 * 但係數已凍結在發包時的 mission.json 裡，同一份 mission 仍然可重放，
 * 「重跑得到新值」只發生在**重新發包**時，而那正是 admin 修正該生效的時點。
 *
 * 租戶排最後：它是最具體的覆寫（per-book），與 esg.repo 依 accountBookId 篩選
 * 的語意一致。
 */
export const buildCoefficientDictionary = (
  snapshot: ISnapshotCoefficient[],
  tenantSnapshot: ISnapshotCoefficient[] = [],
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
      category: c.category || LEGACY_STANDARD_COEFFICIENT_CATEGORY,
      ghgFactors: (c as Record<string, unknown>).ghgFactors,
    });
  });
  snapshot.forEach((c) => dictionary.set(c.id, c));
  tenantSnapshot.forEach((c) => dictionary.set(c.id, c));
  return dictionary;
};

/**
 * Info: (20260914 - Luphia) 快照在 mission.json 裡的**出貨形狀**：`issue.service` 以
 * `JSON.stringify(missionData, null, 2)` 序列化整份，快照巢狀在
 * `prerequisiteData.globalCoefficients` 之下。量體積要量這個形狀——第二版量的是
 * compact 陣列（review 三輪需修-8），靜態字典 compact 343,828 bytes、出貨形狀
 * 456,230 bytes，1.33 倍；量 1 MB 過關的字典實際上傳 1.33 MB。
 */
export const snapshotWireBytes = (snapshot: ISnapshotCoefficient[]): number =>
  Buffer.byteLength(
    JSON.stringify(
      { prerequisiteData: { globalCoefficients: snapshot } },
      null,
      2,
    ),
    "utf8",
  );

/**
 * Info: (20260914 - Luphia) 快照體積守門（review 二輪中-2）：回傳位元組數，超過
 * `MISSION_GLOBAL_COEFFICIENT_SNAPSHOT_MAX_BYTES` 就**拋錯**——「多的是組包端的
 * bug，打回比靜默裁切好」（`CarbonLedgerFactSchema.max(8)` 的同一個立場）。
 * 量的是出貨形狀（`snapshotWireBytes`），與上傳 IPFS 的位元組同源。
 *
 * 呼叫位置（review 三輪阻-1）：發包端在**鎖定訂單之前**呼叫，超過就記 error 並
 * 跳過這一 tick、不動訂單——不能拋在 mint／approve 之後的路徑裡，那裡的 catch
 * 會把訂單回滾成 PAID 再重試，而字典大小是全域條件，重試永遠不會通過。
 */
export const assertSnapshotWithinBudget = (
  snapshot: ISnapshotCoefficient[],
  maxBytes: number = MISSION_GLOBAL_COEFFICIENT_SNAPSHOT_MAX_BYTES,
): number => {
  const bytes = snapshotWireBytes(snapshot);
  if (bytes > maxBytes) {
    throw new Error(
      `[coefficient_snapshot] global coefficient snapshot is ${bytes} bytes ` +
        `(${snapshot.length} rows), over the ${maxBytes}-byte budget. It is embedded in ` +
        "every mission.json and uploaded once per mission — shrink the dictionary or " +
        "filter it per mission instead of raising the budget.",
    );
  }
  return bytes;
};
