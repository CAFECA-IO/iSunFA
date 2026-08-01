// Info: (20260801 - Luphia) 伺服端 PDF 列印的字型設定。共用而非各服務自訂:
// Info: (20260801 - Luphia) 物流報告與數位產品護照都由 headless Chrome 列印、都含中文,
// Info: (20260801 - Luphia) 字型缺失的後果與修法完全相同,分開寫只會讓其中一邊被漏掉
// Info: (20260801 - Luphia) (實測 dpp.service.ts 的堆疊完全沒有 CJK 家族,頁尾中文必為方框)。

/**
 * Info: (20260801 - Luphia) 列印用字型堆疊。
 *
 * **家族名必須涵蓋各平台的真實名稱,不能只寫網頁名。**
 * 先前只寫了 `"Noto Sans TC"` —— 那是 Google Fonts 的網頁名稱;
 * Linux 上 `fonts-noto-cjk` 安裝出來的家族名是 `"Noto Sans CJK TC"`,
 * 兩者是不同字串,不會互相匹配。實測伺服器 `fc-match "Noto Sans CJK TC"`
 * 回 DejaVu Sans,`fc-list :lang=zh` 只有 X11 點陣字 `Fixed`,
 * 結果是所有中文字取 DejaVu 的 .notdef,渲染成空心方框。
 *
 * 順序即 per-character fallback 的優先序:拉丁字優先取 Helvetica/Arial 一類,
 * CJK 家族列於其後供中文字使用。刻意不引入網路字型:
 * 一是離線列印仍須正確排版,二是外部字型會讓 Chrome 嵌入額外子集、增加體積。
 *
 * **家族名以單引號包覆而非雙引號。** 這個字串會被嵌進兩種上下文:<style> 區塊,
 * 以及 dpp 頁尾那種 `style="..."` 的行內屬性。雙引號會提前結束屬性值,
 * 讓整段樣式失效(且不會有任何錯誤,只是靜默地不套用)。CSS 兩種引號等價,
 * 單引號在兩處都安全。
 *
 * **注意這份清單不保證字型存在。** 它只保證「若存在就找得到」。
 * 環境是否真的有可用的 CJK 字形由 pdf_font_probe 於列印前實測,
 * 缺失即 fail fast —— 一份地點名稱全是方框的報告不是成功的輸出。
 */
export const PDF_FONT_STACK = [
  // Info: (20260801 - Luphia) 拉丁字優先序
  "-apple-system",
  "'Helvetica Neue'",
  "Arial",
  // Info: (20260801 - Luphia) macOS 繁中
  "'PingFang TC'",
  "'Heiti TC'",
  // Info: (20260801 - Luphia) Windows 繁中
  "'Microsoft JhengHei'",
  // Info: (20260801 - Luphia) Linux:apt fonts-noto-cjk 的家族名(本次缺的就是這個)
  "'Noto Sans CJK TC'",
  "'Noto Sans CJK SC'",
  "'Source Han Sans TC'",
  // Info: (20260801 - Luphia) Google Fonts / 手動安裝 OTF 的家族名
  "'Noto Sans TC'",
  // Info: (20260801 - Luphia) 舊版 Linux 發行版的常見備援
  "'WenQuanYi Zen Hei'",
  "'Droid Sans Fallback'",
  "sans-serif",
].join(", ");

/**
 * Info: (20260801 - Luphia) 探測用的中文字元。取常用字即可 ——
 * 目的是判斷「這個環境有沒有中文字形」,不是逐字檢查報告內容。
 * 若連這個字都沒有,報告裡的地點名稱也不可能有。
 */
export const PDF_FONT_PROBE_CJK_SAMPLE = "測";

/**
 * Info: (20260801 - Luphia) 對照用的碼位。U+FFFF 是 Unicode 永久保留的 noncharacter,
 * 任何字型都不會為它提供字形,因此它的量測寬度就是該字型 .notdef 的寬度。
 * 拿中文字的寬度與它相比,相等即代表中文字也落在 .notdef 上。
 *
 * 用這個對照而非寫死一個門檻值,是為了讓判定與字型、字級、縮放都無關 ——
 * 門檻值會隨字型換一次就失效,而「是否等於 .notdef」在任何字型下都成立。
 */
// Info: (20260801 - Luphia) 必須寫成轉義而非字面字元:U+FFFF 在編輯器中不可見,
// Info: (20260801 - Luphia) 任何閱讀、複製或經過字元正規化的工具都可能悄悄把它破壞掉
// Info: (20260801 - Luphia) (#6585 修過同類問題:正則裡藏著一個看不見的 VS16)。
export const PDF_FONT_PROBE_NOTDEF_REFERENCE = "\uFFFF";

/** Info: (20260801 - Luphia) 確認 canvas 真的套用了字型的對照字元(拉丁字必然有字形) */
export const PDF_FONT_PROBE_LATIN_REFERENCE = "M";
