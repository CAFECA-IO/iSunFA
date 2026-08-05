// Info: (20260803 - Tzuhan) 表3.8 的版面辨識常數(issue_drafts/inventory_table_import/01)
//
// Info: (20260803 - Tzuhan) 為什麼需要這一組常數:
// Info: (20260803 - Tzuhan) 同一份 PDF、同一組提示詞,兩輪落地的表3.8 版面不同 ——
// Info: (20260803 - Tzuhan) 第一輪把廠址與類別攤平到每一列,第二輪讓它們各自獨立成列並重複表頭。
// Info: (20260803 - Tzuhan) 兩者都是合理的攤平方式,而提示詞只能約束「逐字照抄儲存格內容」,
// Info: (20260803 - Tzuhan) 約束不了攤平策略。所以解析器必須同時吃兩種版面。
//
// Info: (20260803 - Tzuhan) 原本的判定用啟發式(「含中文、不以類別開頭、非子代碼」即為廠址),
// Info: (20260803 - Tzuhan) 結果第二輪的重複表頭「報告邊界」完全符合三個條件 → 被當成廠址名,
// Info: (20260803 - Tzuhan) 台北與屏東的資料全部併進這個假廠址,差額 8121.9184。
// Info: (20260803 - Tzuhan) 教訓是:辨識條件要**收緊到明表**,不要用「不是 X 就是 Y」的排除法。

import { Iso14064Category } from "@/constants/esg";

/**
 * Info: (20260803 - Tzuhan) 表頭字樣。一列的非空儲存格全部落在此集合內即為表頭列,整列跳過。
 * 以明表列出而非用啟發式:漏列一個字樣的後果是多一列未解析(看得見),
 * 而啟發式誤判的後果是資料歸屬悄悄改變(看不見)。
 */
export const TABLE38_HEADER_TOKENS: readonly string[] = [
  "公司",
  "報告邊界",
  "報告邊界類型",
  "類型",
  "溫室氣體排放量",
  "溫室氣體排放量各類別總和",
  "排放量",
  "各類別總和",
];

/**
 * Info: (20260803 - Tzuhan) 廠址儲存格的正規形式:以「(數字)」開頭(原文即 `(1) 總公司`)。
 * 這是最可靠的訊號 —— 表頭字樣不會有這個前綴。
 */
export const TABLE38_SITE_INDEX_PATTERN = /^\(\s*[0-9]+\s*\)/;

/**
 * Info: (20260805 - Tzuhan) **第三種版面**:廠址名寫在表格外的獨立文字行。
 *
 * 實測落地的形狀 —— 表3.8 被拆成三張子表格,每張前面一行純文字標籤:
 *
 * ```
 * (1) 總公司
 * | 報告邊界 | 類型 | 溫室氣體排放量 ... |
 * ```
 *
 * 解析器原本只看含 `|` 的行,這種標籤整行被跳過,於是 currentSite 永遠是空的,
 * **72 列全部落進 unparsedRows** → 廠址加總 0 → 勾稽失敗 → 不入帳 → 桑基圖不畫。
 *
 * 為什麼不直接沿用 isSiteCell:它的備援訊號是「含公司或廠」,
 * 而表格標題「表3.8 **各公司**溫室氣體各類別排放量統計表」也含「公司」——
 * 拿它比對純文字行會把標題認成廠址。
 * 這裡收緊到明表:`(n)` 前綴 + 一個短名 + 整行到此為止,不用排除法。
 */
export const TABLE38_STANDALONE_SITE_PATTERN =
  /^\(\s*[0-9]+\s*\)\s*[^\s|]{1,20}$/;

/**
 * Info: (20260803 - Tzuhan) 沒有 (n) 前綴時的備援訊號:含「公司」或「廠」。
 * 仍須排除表頭字樣 —— 「公司」本身就是第一輪的欄名。
 */
export const TABLE38_SITE_KEYWORDS: readonly string[] = ["公司", "廠"];

/**
 * Info: (20260803 - Tzuhan) 類別標籤(可獨立成列並攜帶該類別小計)。
 * 第二輪的版面即為 `| 類別一 | | 17.8494 | |`,原本只認類別六,
 * 導致類別一~五的小計列全部落進 unparsedRows(三廠址共 15 列)。
 */
export const TABLE38_CATEGORY_LABELS: readonly string[] = [
  "類別一",
  "類別二",
  "類別三",
  "類別四",
  "類別五",
  "類別六",
];

/**
 * Info: (20260803 - Tzuhan) 類別標籤 → ISO 類別。明表而非從「類別N」推算序位:
 * 推算要處理中文數字轉換,而那是為了省六行而引入的一個可能出錯的步驟。
 */
export const TABLE38_CATEGORY_LABEL_TO_ISO: Readonly<
  Record<string, Iso14064Category>
> = {
  類別一: Iso14064Category.CATEGORY_1,
  類別二: Iso14064Category.CATEGORY_2,
  類別三: Iso14064Category.CATEGORY_3,
  類別四: Iso14064Category.CATEGORY_4,
  類別五: Iso14064Category.CATEGORY_5,
  類別六: Iso14064Category.CATEGORY_6,
};

/**
 * Info: (20260803 - Tzuhan) 廠址總計列的字樣(帶基準),用於與資料列區分。
 * 這些列的第一欄是長句而非廠址名,不可誤認為廠址。
 */
export const TABLE38_SITE_TOTAL_TOKEN = "總排放量";
