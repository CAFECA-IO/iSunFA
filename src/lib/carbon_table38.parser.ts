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
  TABLE38_CATEGORY_LABEL_TO_ISO,
  TABLE38_CATEGORY_LABELS,
  TABLE38_HEADER_TOKENS,
  TABLE38_SITE_INDEX_PATTERN,
  TABLE38_SITE_KEYWORDS,
  TABLE38_STANDALONE_SITE_PATTERN,
  TABLE38_SITE_TOTAL_TOKEN,
} from "@/constants/table38_layout";
import {
  EmissionBasisEnum,
  ImportedQuantityStateEnum,
  LOCATION_BASIS_TOKENS,
  MARKET_BASIS_TOKENS,
  NOT_APPLICABLE_TOKENS,
  NOT_SIGNIFICANT_TOKENS,
  TONNE_TO_KG_MULTIPLIER,
} from "@/constants/imported_quantity";
import { stripHtmlLineBreaks } from "@/lib/utils/markdown_line_break";

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

/**
 * Info: (20260803 - Tzuhan) 原文標示的類別小計。獨立成一份清單而非掛在資料列上,
 * 因為兩種版面把它放在不同位置:第一輪在子代碼列的第二個數值欄,
 * 第二輪自己獨立成一列(`| 類別一 | | 17.8494 | |`)。
 * 收斂成同一份清單後,勾稽層不必知道版面差異。
 */
export interface IParsedCategorySubtotal {
  site: string;
  isoCategory: Iso14064Category;
  /** Info: (20260803 - Tzuhan) 原文為 NA/NS 時為 null —— 那代表「原文沒印小計」,不是零 */
  tonneCo2e: string | null;
}

export interface IParsedTable38 {
  rows: IParsedEmissionRow[];
  siteTotals: IParsedSiteTotal[];
  categorySubtotals: IParsedCategorySubtotal[];
  /**
   * Info: (20260803 - Tzuhan) 沒能解析的資料列原文。**必須回傳而不是丟掉**:
   * 靜默跳過一列的後果是總量少一筆卻依然「勾稽通過」(因為小計也少了同一筆),
   * 那是最難發現的一種錯。呼叫端據此決定要不要拒絕整張表。
   */
  unparsedRows: string[];
}

/**
 * Info: (20260803 - Tzuhan) 去掉 markdown 的強調標記(**粗體**、*斜體*、__底線__)。
 *
 * 實測:模型以 `| **(1) 總公司** | | | |` 標示廠址,`**` 因此進了廠址名,
 * 一路帶到對帳表與桑基圖的節點上(「**(1) 總公司** 1.1」)。
 * **那是排版不是內容** —— 逐字照錄的對象是儲存格的文字,不是它的字重。
 * 只剝除成對的標記,不動內容中真正的星號。
 */
const stripEmphasis = (cell: string): string =>
  cell
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(^|[^*])\*([^*]+?)\*($|[^*])/g, "$1$2$3")
    .trim();

/**
 * Info: (20260803 - Tzuhan) markdown 表格列 → 儲存格陣列(去掉首尾的空欄)
 *
 * Info: (20260804 - Tzuhan) 一併清掉 `<br>`,與 stripEmphasis 同一個理由:版面不是內容。
 * 實測不清掉會壞四處,而且全部是靜默的:
 * `2,775.<br>6475` 解不出數字、`(1) 總公<br>司` 成為污染的廠址名一路帶進桑基圖節點、
 * `1.<br>1` 對不到子代碼、含 `<br>` 的重複表頭被當成資料列。
 */
const splitRow = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => stripEmphasis(stripHtmlLineBreaks(cell).trim()));

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

const isHeaderToken = (cell: string): boolean =>
  TABLE38_HEADER_TOKENS.some(
    (token) => normalizeToken(cell) === normalizeToken(token),
  );

/**
 * Info: (20260803 - Tzuhan) 表頭列:所有非空儲存格都是表頭字樣。
 * 第二輪的版面在每個廠址前重複一次表頭,不跳過就會被當成資料。
 */
const isHeaderRow = (cells: string[]): boolean => {
  const filled = cells.filter((cell) => cell.length > 0);
  return filled.length > 0 && filled.every(isHeaderToken);
};

/**
 * Info: (20260803 - Tzuhan) 廠址儲存格的判定。**收緊到明表**:
 * 以「(n)」開頭,或含「公司」「廠」且本身不是表頭字樣。
 *
 * 原本用排除法(「含中文、不以類別開頭、非子代碼」即為廠址),而第二輪的重複表頭
 * 「報告邊界」完全符合那三個條件 → 被當成廠址,台北與屏東的資料全部併進假廠址。
 * 排除法的失敗方式是靜默改變資料歸屬;明表的失敗方式是多一列未解析。後者看得見。
 */
const isSiteCell = (cell: string): boolean => {
  if (cell.length === 0) return false;
  if (isHeaderToken(cell)) return false;
  if (cell.includes(TABLE38_SITE_TOTAL_TOKEN)) return false;
  if (findSubCategory(cell) !== null) return false;
  if (TABLE38_SITE_INDEX_PATTERN.test(cell)) return true;
  if (TABLE38_CATEGORY_LABELS.some((label) => cell.startsWith(label))) {
    return false;
  }
  return TABLE38_SITE_KEYWORDS.some((keyword) => cell.includes(keyword));
};

// Info: (20260803 - Tzuhan) 類別標籤儲存格(可獨立成列攜帶小計)
const findCategoryLabel = (cells: string[]): string | undefined =>
  cells.find((cell) =>
    TABLE38_CATEGORY_LABELS.some((label) => normalizeToken(cell) === label),
  );

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
  const categorySubtotals: IParsedCategorySubtotal[] = [];
  const unparsedRows: string[] = [];
  let currentSite = "";

  /**
   * Info: (20260805 - Tzuhan) 表格外的獨立廠址標籤(第三種版面,見 TABLE38_STANDALONE_SITE_PATTERN)。
   * 剝除粗體與 `<br>` 的理由與 splitRow 相同:排版不是內容。
   */
  const asStandaloneSiteLabel = (line: string): string | null => {
    const cleaned = stripEmphasis(stripHtmlLineBreaks(line).trim());
    return TABLE38_STANDALONE_SITE_PATTERN.test(cleaned) ? cleaned : null;
  };

  markdown.split("\n").forEach((line) => {
    if (!line.includes("|")) {
      const standaloneSite = asStandaloneSiteLabel(line);
      if (standaloneSite) currentSite = standaloneSite;
      return;
    }
    const cells = splitRow(line);
    if (cells.length < 2 || isSeparatorRow(cells)) return;
    // Info: (20260803 - Tzuhan) 重複表頭整列跳過(第二輪每個廠址前都重複一次)
    if (isHeaderRow(cells)) return;

    // Info: (20260803 - Tzuhan) 廠址沿用:合併儲存格攤平後,後續列的廠址欄是空的
    const siteCandidate = cells.find(isSiteCell);
    if (siteCandidate) currentSite = siteCandidate;

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
    const categoryLabelCell = subCategoryCell
      ? undefined
      : findCategoryLabel(cells);

    /**
     * Info: (20260803 - Tzuhan) 類別標籤獨立成列(第二輪版面):該列攜帶的是**類別小計**,
     * 子代碼在後續各列。類別六例外 —— 它是開放類別、本身就沒有子項,
     * 故除了小計之外還要產出一筆資料列(子代碼 "6")。
     */
    if (categoryLabelCell && currentSite.length > 0) {
      const label = normalizeToken(categoryLabelCell);
      const isoCategory = TABLE38_CATEGORY_LABEL_TO_ISO[label];
      const afterLabel = cells
        .slice(cells.indexOf(categoryLabelCell) + 1)
        .map((cell) => readQuantityCell(cell))
        .filter((reading): reading is ICellReading => reading !== null);
      if (isoCategory !== undefined) {
        // Info: (20260803 - Tzuhan) 小計取該列最後一個可判讀值:類別六那列前面還有子代碼的量
        const subtotalReading = afterLabel[afterLabel.length - 1];
        categorySubtotals.push({
          site: currentSite,
          isoCategory,
          tonneCo2e: subtotalReading?.tonneCo2e ?? null,
        });
      }
      const openCategory = CATEGORY_LABEL_TO_SUBCATEGORY[label];
      if (openCategory === undefined) return;
      // Info: (20260803 - Tzuhan) 類別六:第一個可判讀值即其排放量
      const quantityReading = afterLabel[0];
      if (!quantityReading) return;
      rows.push({
        site: currentSite,
        subCategory: openCategory,
        isoCategory: ISO_CATEGORY_BY_SUBCATEGORY[openCategory],
        scope: SCOPE_BY_ISO_SUBCATEGORY[openCategory].scope,
        state: quantityReading.state,
        tonneCo2e: quantityReading.tonneCo2e,
        co2eKg:
          quantityReading.tonneCo2e === null
            ? null
            : toKg(quantityReading.tonneCo2e),
        categorySubtotalTonne: null,
      });
      return;
    }

    if (!subCategoryCell) {
      // Info: (20260803 - Tzuhan) 純標題列不算未解析(它們本來就沒有資料)
      const hasQuantity = cells.some((cell) => readQuantityCell(cell) !== null);
      if (hasQuantity) unparsedRows.push(line.trim());
      return;
    }
    const anchorCell = subCategoryCell;
    const subCategory = findSubCategory(subCategoryCell);
    if (subCategory === null) {
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
    /**
     * Info: (20260803 - Tzuhan) 第一輪版面的小計掛在子代碼列的第二個數值欄。
     * 一併收進同一份清單,勾稽層因此不必知道版面差異(只在該類別尚無小計時登錄,
     * 避免同一類別的每一列都推一筆)。
     */
    if (subtotal?.tonneCo2e) {
      const isoCategory = ISO_CATEGORY_BY_SUBCATEGORY[subCategory];
      const seen = categorySubtotals.some(
        (item) => item.site === currentSite && item.isoCategory === isoCategory,
      );
      if (!seen) {
        categorySubtotals.push({
          site: currentSite,
          isoCategory,
          tonneCo2e: subtotal.tonneCo2e,
        });
      }
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

  return { rows, siteTotals, categorySubtotals, unparsedRows };
}

/**
 * Info: (20260803 - Tzuhan) 從表3.6 / 表3.7 取全公司總排放量(第三層勾稽的對照值)。
 *
 * 取「排放當量」那一列的**最後一個**數值:那張表的最右欄就是總排放量,
 * 而中間各欄是類別小計。以欄名比對反而不可靠 —— 表頭跨兩列且原文有換行,
 * 「總排放 量」這種被拆開的欄名對不上任何固定字串。
 *
 * 找不到即回 null:寧可少做第三層勾稽,也不要拿一個猜來的數字去比對。
 */
export function extractCompanyTotalTonne(markdown: string): string | null {
  const rows = markdown.split("\n").filter((line) => line.includes("|"));
  const quantityRow = rows.find((line) => {
    const cells = splitRow(line);
    return cells.some((cell) => /排放當量/.test(cell));
  });
  if (!quantityRow) return null;
  const values = splitRow(quantityRow)
    .map(parseTonne)
    .filter((value): value is string => value !== null);
  return values.length > 0 ? values[values.length - 1] : null;
}
