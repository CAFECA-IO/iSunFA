// Info: (20260730 - Tzuhan) PDF 文字層品質閘門門檻
// Info: (20260730 - Tzuhan) 門檻取自三份真實年報 + 一份真實盤查報告的實測:
// Info: (20260730 - Tzuhan)   高興昌盤查報告 64 頁 888 字/頁、解碼失敗 0        → 走純文字
// Info: (20260730 - Tzuhan)   台積永續報告   278 頁 928 字/頁、解碼失敗 0       → 走純文字
// Info: (20260730 - Tzuhan)   三星永續報告   106 頁 795 字/頁、解碼失敗 0       → 走純文字
// Info: (20260730 - Tzuhan)   世德永續報告   94 頁 509 字/頁、解碼失敗率 0.52%  → 退回視覺模型(失敗字元集中在數字)

/**
 * Info: (20260730 - Tzuhan) 判定 PDF 是否具備可信的文字層。
 * TEXT   —— 文字層乾淨,抽純文字送 LLM(不受 inlineData 大小上限、token 成本大幅降低)
 * VISION —— 文字層存在但不可信(字型未提供 ToUnicode,數字會變成替換字元),退回 PDF 原檔走視覺模型
 * REJECT —— 幾乎沒有文字層且原檔超過視覺模型上限,無可用路徑,必須明確告知使用者
 */
export enum PdfTextLayerDecisionEnum {
  TEXT = "text",
  VISION = "vision",
  REJECT = "reject",
}

// Info: (20260730 - Tzuhan) 低於此字數/頁視為掃描件或圖片型 PDF(實測最低的真實報告為 509 字/頁)
export const PDF_TEXT_LAYER_MIN_CHARS_PER_PAGE = 120;

// Info: (20260730 - Tzuhan) 解碼失敗字元(U+FFFD)佔比上限。ESG 報告的價值在數字,
// Info: (20260730 - Tzuhan) 世德那份的失敗字元正好落在數字上,0.52% 已足以讓整份數據不可用,故門檻壓在 0.2%
export const PDF_TEXT_LAYER_MAX_UNDECODED_RATIO = 0.002;

// Info: (20260730 - Tzuhan) 解碼失敗字元緊鄰數字/年份/百分比時零容忍:一個就退視覺模型
export const PDF_TEXT_LAYER_MAX_NUMERIC_UNDECODED = 0;

// Info: (20260730 - Tzuhan) Unicode 替換字元:PDF 字型缺 ToUnicode 對照時抽取器的輸出
export const PDF_UNDECODED_CHAR = "�";

// Info: (20260730 - Tzuhan) 同列儲存格分隔符:盤查報告的排放量統計表若無分隔,抽出來會是一串無歸屬的數字
export const PDF_TEXT_CELL_SEPARATOR = "\t";

// Info: (20260730 - Tzuhan) 頁邊界標記:讓 LLM 照抄時能一併帶出頁碼,人工查核可回原文對照
// Info: (20260730 - Tzuhan) 同時是「頁碼索引兩階段」切片的定位依據 —— 標記格式一改,切片即失效,兩者必須同源
export const PDF_TEXT_PAGE_JOINER = "\n-- p.page_number/total_number --";

// Info: (20260730 - Tzuhan) 上述標記在輸出後的實際樣貌(page_number/total_number 已代入),用於反向定位頁邊界
export const PDF_TEXT_PAGE_MARKER_PATTERN = /-- p\.(\d+)\/(\d+) --/g;

/**
 * Info: (20260730 - Tzuhan) 頁碼索引切片的前後緩衝頁數。
 * 索引只給「起始頁」,而一節可能跨頁、標題也可能落在頁尾,故前後各多取一頁。
 * 值越大越安全但越貴;1 頁在實測的 832 字/頁下約多 800 字,代價可接受。
 */
export const PDF_TEXT_PAGE_SLICE_PADDING = 1;

/**
 * Info: (20260730 - Tzuhan) 切片結果的最低可用字數。
 * 索引抓錯頁或該節其實不在文件中時,切出來會過短;低於此值一律退回送全文,
 * 寧可多花 token 也不能讓「內容其實存在卻沒被看到」變成靜默的資料遺失。
 */
export const PDF_TEXT_PAGE_SLICE_MIN_CHARS = 200;

/**
 * Info: (20260814 - Emily) 「大圖」的門檻：長邊達到幾 px
 * (`data/issue_drafts/open/25_image_only_sections.md`)。
 *
 * 兩個實測資料點：
 * - 高興昌那份 p6 的組織架構圖是 **1050×1417** —— 那一節的內容全在裡面
 * - 排版用的圖示與小裝飾在 400×300 以下
 *
 * 取 600：A4 在常見的嵌入解析度下，半頁高約落在這個量級 ——
 * 一張撐得起一整節內容的圖不會比半頁小。
 *
 * ⚠️ 只有一份真實樣本，這個值需要第二份報告來校準。
 * `extractPdfPageImagery` 會把每頁量到的尺寸記進 log，就是為了讓下一份報告能對答案。
 *
 * 註：`pdf-parse` 的 `getImage()` **自己會先濾掉小圖**（實測 120×48 與 60×60 不回報、
 * 400×300 回報），而且濾的是內在尺寸不是排版尺寸。所以這裡看到的數字已經過一層底線，
 * 本門檻是在那之上再收一次。
 */
export const PDF_PAGE_LARGE_IMAGE_MIN_LONG_EDGE_PX = 600;

/**
 * Info: (20260814 - Emily) 最多允許多少**比例**的頁面走視覺模型。
 *
 * 用比例而不是絕對頁數：64 頁挑 3 頁（4.7%）與 300 頁挑 20 頁（6.7%）是同一種情況，
 * 絕對上限會把後者誤判成「整份都是圖」。
 *
 * 超過就一頁都不挑，交由 `assessPdfTextLayer` 判成 VISION 走整份 ——
 * 逐頁各送一次會比整份送還貴，而且拼不回完整上下文。
 */
export const PDF_PAGE_IMAGE_MAX_VISION_SHARE = 0.15;

/**
 * Info: (20260814 - Emily) 比例算出來不足這個數時的下限。
 * 短報告（例如 10 頁）乘以比例只有 1.5 頁，而「兩頁的內容在圖裡」在短報告裡很正常。
 */
export const PDF_PAGE_IMAGE_MIN_VISION_PAGES = 3;
