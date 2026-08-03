// Info: (20260803 - Tzuhan) 表3.8「各公司溫室氣體各類別排放量統計表」決定性解析器(Issue B 第 1~3 點)
//
// Info: (20260803 - Tzuhan) 分工鐵律:LLM 只負責把原文表格逐字照抄成 markdown(Issue A),
// Info: (20260803 - Tzuhan) 從 markdown 到帳本的每一步解析、歸類、加總、勾稽都在這裡用 TypeScript 做完。
// Info: (20260803 - Tzuhan) 理由不是效能而是可審計性:規則引擎的每一步都能重跑並得到同一結果,
// Info: (20260803 - Tzuhan) 而模型的加總無法重現、也無法在事後說明它為什麼是那個數字。
//
// Info: (20260803 - Tzuhan) 本檔為純函數,不碰 DB、不碰 React,故可完整單元測試。

import { Prisma } from "@/generated";
import { GhgProtocolCategory, Iso14064Category } from "@/constants/esg";
import {
  CATEGORY_LABEL_TO_SUBCATEGORY,
  findSubCategory,
  ISO_CATEGORY_BY_SUBCATEGORY,
  Iso14064SubCategory,
  SCOPE_BY_ISO_SUBCATEGORY,
} from "@/constants/iso14064_subcategory";
import {
  EmissionBasisEnum,
  ImportedQuantityStateEnum,
  LOCATION_BASIS_TOKENS,
  MARKET_BASIS_TOKENS,
  NOT_APPLICABLE_TOKENS,
  NOT_SIGNIFICANT_TOKENS,
  TONNE_TO_KG_MULTIPLIER,
} from "@/constants/imported_quantity";

export interface IParsedEmissionRow {
  site: string;
  subCategory: Iso14064SubCategory;
  isoCategory: Iso14064Category;
  scope: GhgProtocolCategory;
  state: ImportedQuantityStateEnum;
  /** Info: (20260803 - Tzuhan) 公噸 CO2e。非 REPORTED 一律 null —— 不是 0(見 imported_quantity 註解) */
  tonneCo2e: string | null;
  /** Info: (20260803 - Tzuhan) 換算後的公斤數,供 ledger 使用;同樣只在 REPORTED 有值 */
  co2eKg: string | null;
  /** Info: (20260803 - Tzuhan) 原文標示的該類別小計(只在類別首列出現),供第一層勾稽 */
  categorySubtotalTonne: string | null;
}

export interface IParsedSiteTotal {
  site: string;
  basis: EmissionBasisEnum;
  tonneCo2e: string;
}

export interface IParsedTable38 {
  rows: IParsedEmissionRow[];
  siteTotals: IParsedSiteTotal[];
  /**
   * Info: (20260803 - Tzuhan) 沒能解析的資料列原文。**必須回傳而不是丟掉**:
   * 靜默跳過一列的後果是總量少一筆卻依然「勾稽通過」(因為小計也少了同一筆),
   * 那是最難發現的一種錯。呼叫端據此決定要不要拒絕整張表。
   */
  unparsedRows: string[];
}

// Info: (20260803 - Tzuhan) markdown 表格列 → 儲存格陣列(去掉首尾的空欄)
const splitRow = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

// Info: (20260803 - Tzuhan) `| --- | :--- |` 這類分隔列
const isSeparatorRow = (cells: string[]): boolean =>
  cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));

const normalizeToken = (cell: string): string =>
  cell
    .toUpperCase()
    .replace(/[\s　]/g, "")
    .replace(/[（）]/g, "");

const matchesAny = (cell: string, tokens: readonly string[]): boolean => {
  const normalized = normalizeToken(cell);
  return tokens.some((token) => normalized === normalizeToken(token));
};

/**
 * Info: (20260803 - Tzuhan) 數值儲存格 → Decimal 字串。
 * 原文的千分位逗號要去掉(實測「2,775.6475」),但除此之外不做任何清理 ——
 * 看不懂的字元一律回 null 讓上層攔下,不猜、不截斷、不取最長數字。
 */
const parseTonne = (cell: string): string | null => {
  const cleaned = cell.replace(/,/g, "").replace(/[\s　]/g, "");
  if (cleaned.length === 0) return null;
  if (!/^-?[0-9]+(\.[0-9]+)?$/.test(cleaned)) return null;
  return new Prisma.Decimal(cleaned).toString();
};

const toKg = (tonne: string): string =>
  new Prisma.Decimal(tonne).mul(TONNE_TO_KG_MULTIPLIER).toString();

interface ICellReading {
  state: ImportedQuantityStateEnum;
  tonneCo2e: string | null;
}

/**
 * Info: (20260803 - Tzuhan) 判讀單一數量儲存格的三態。空白不視為任何一態(回 null),
 * 因為「原文沒寫」既不是不適用也不是零 —— 它是無法判定,只能讓勾稽攔下。
 */
const readQuantityCell = (cell: string): ICellReading | null => {
  if (matchesAny(cell, NOT_APPLICABLE_TOKENS)) {
    return {
      state: ImportedQuantityStateEnum.NOT_APPLICABLE,
      tonneCo2e: null,
    };
  }
  if (matchesAny(cell, NOT_SIGNIFICANT_TOKENS)) {
    return {
      state: ImportedQuantityStateEnum.NOT_SIGNIFICANT,
      tonneCo2e: null,
    };
  }
  const tonne = parseTonne(cell);
  if (tonne === null) return null;
  // Info: (20260803 - Tzuhan) 原文明寫的 0.0000 是 REPORTED:已鑑別且量化為零,與 NA/NS 不同
  return { state: ImportedQuantityStateEnum.REPORTED, tonneCo2e: tonne };
};

const detectBasis = (cells: string[]): EmissionBasisEnum | null => {
  const joined = cells.join("");
  if (LOCATION_BASIS_TOKENS.some((token) => joined.includes(token))) {
    return EmissionBasisEnum.LOCATION;
  }
  if (MARKET_BASIS_TOKENS.some((token) => joined.includes(token))) {
    return EmissionBasisEnum.MARKET;
  }
  return null;
};

/**
 * Info: (20260803 - Tzuhan) 廠址儲存格的判定:原文以「(1) 總公司」「(3) 屏東分公司」開頭。
 * 抓「含中文且非類別/子代碼」的儲存格,並沿用上一列的廠址 ——
 * 合併儲存格在 markdown 裡會變成空欄,同一廠址的第二列之後都沒有廠址字樣。
 */
const isSiteCell = (cell: string): boolean => {
  if (cell.length === 0) return false;
  if (/^類別/.test(cell)) return false;
  if (findSubCategory(cell) !== null) return false;
  return /[一-鿿]/.test(cell);
};

/**
 * Info: (20260803 - Tzuhan) 解析表3.8 的 markdown。
 *
 * 對版面**不做強假設**:不靠欄位位置,而是逐列尋找「子代碼」與「數量儲存格」。
 * 原因是這張表在原文裡有合併儲存格與重複表頭,而模型照抄時對合併格的攤平方式
 * 每次不完全一致;綁死欄位序號會在下一份報告失效,而失效的方式是靜默少幾列。
 */
export function parseTable38(markdown: string): IParsedTable38 {
  const rows: IParsedEmissionRow[] = [];
  const siteTotals: IParsedSiteTotal[] = [];
  const unparsedRows: string[] = [];
  let currentSite = "";

  markdown.split("\n").forEach((line) => {
    if (!line.includes("|")) return;
    const cells = splitRow(line);
    if (cells.length < 2 || isSeparatorRow(cells)) return;

    // Info: (20260803 - Tzuhan) 廠址沿用:合併儲存格攤平後,後續列的廠址欄是空的
    const siteCandidate = cells.find(isSiteCell);
    if (siteCandidate && !/總排放量/.test(siteCandidate)) {
      currentSite = siteCandidate;
    }

    // Info: (20260803 - Tzuhan) 廠址總計列:帶基準字樣,取該列唯一的數值
    const basis = detectBasis(cells);
    if (basis !== null) {
      const total = cells.map(parseTonne).find((value) => value !== null);
      if (total && currentSite.length > 0) {
        siteTotals.push({ site: currentSite, basis, tonneCo2e: total });
      } else {
        unparsedRows.push(line.trim());
      }
      return;
    }

    const subCategoryCell = cells.find(
      (cell) => findSubCategory(cell) !== null && !/^類別/.test(cell),
    );
    /**
     * Info: (20260803 - Tzuhan) 類別六沒有子代碼欄(原文寫「-」),改由類別標籤取代碼。
     * 只有類別六走這條路:其他類別缺子代碼是真的異常,要落進 unparsedRows 讓人看到。
     */
    const categoryLabelCell = subCategoryCell
      ? undefined
      : cells.find((cell) => CATEGORY_LABEL_TO_SUBCATEGORY[cell] !== undefined);
    if (!subCategoryCell && !categoryLabelCell) {
      // Info: (20260803 - Tzuhan) 表頭與純標題列不算未解析(它們本來就沒有資料)
      const hasQuantity = cells.some((cell) => readQuantityCell(cell) !== null);
      if (hasQuantity) unparsedRows.push(line.trim());
      return;
    }
    const anchorCell = subCategoryCell ?? (categoryLabelCell as string);
    const subCategory = subCategoryCell
      ? findSubCategory(subCategoryCell)
      : CATEGORY_LABEL_TO_SUBCATEGORY[anchorCell];
    if (subCategory === null || subCategory === undefined) {
      unparsedRows.push(line.trim());
      return;
    }

    /**
     * Info: (20260803 - Tzuhan) 子代碼**之後**的儲存格才是數量:
     * 前面的欄位可能含「類別一」這種在後續也會被判讀的字樣。
     * 第一個可判讀者為該子代碼的排放量,第二個(若有)為原文的類別小計。
     */
    const afterIndex = cells.indexOf(anchorCell) + 1;
    const readings = cells
      .slice(afterIndex)
      .map((cell) => readQuantityCell(cell))
      .filter((reading): reading is ICellReading => reading !== null);
    if (readings.length === 0) {
      unparsedRows.push(line.trim());
      return;
    }

    const [quantity, subtotal] = readings;
    if (currentSite.length === 0) {
      unparsedRows.push(line.trim());
      return;
    }
    rows.push({
      site: currentSite,
      subCategory,
      isoCategory: ISO_CATEGORY_BY_SUBCATEGORY[subCategory],
      scope: SCOPE_BY_ISO_SUBCATEGORY[subCategory].scope,
      state: quantity.state,
      tonneCo2e: quantity.tonneCo2e,
      co2eKg: quantity.tonneCo2e === null ? null : toKg(quantity.tonneCo2e),
      categorySubtotalTonne: subtotal?.tonneCo2e ?? null,
    });
  });

  return { rows, siteTotals, unparsedRows };
}
