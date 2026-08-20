/**
 * Info: (20260820 - Julian) 要放進 `href` 的外部連結，判準只有這一份（review 第 1 條）。
 *
 * ## 為什麼 `z.string().url()` 不夠
 *
 * zod 的 `.url()` 走的是 `new URL()`，而 `new URL()` 認得**所有**協定。
 * 本 repo 實測（zod 4.4.3）：
 *
 * | 值 | `.url()` |
 * |---|---|
 * | `javascript:alert(1)` | 通過 |
 * | `data:text/html,<script>` | 通過 |
 * | `file:///etc/passwd` | 通過 |
 * | `vbscript:msgbox(1)` | 通過 |
 * | `N/A` | 擋下 |
 *
 * 前四個會直接進到 `<a href={...}>`。`logistics_pdf.ts` 的地圖影像已經為此
 * 立過一次白名單（`LOGISTICS_PDF_MAP_DATA_URL_PATTERN` 的註解：「必須先把
 * javascript: 之類的協定擋在門外」），這裡是同一件事的第二個落點。
 *
 * ## 為什麼**不**擋內網位址
 *
 * 想過。`http://intranet.local/filings/2026-0819` 對一家把公文放在內部
 * 文件伺服器的公司是完全正當的紀錄位置，擋掉等於逼他們填一個對外看得到、
 * 但其實不是那份公文的網址 —— 那比內網連結更糟，因為它看起來可以查證。
 *
 * 真正的問題不是「連到哪」而是「看的人不知道它連到哪」。因此處置在呈現端：
 * 畫面把 host 顯示出來，讓讀的人自己判斷 `intranet.local` 與主管機關的網域
 * 不是同一回事。**這一支只回答協定安不安全，不回答內容可不可信** ——
 * 一支宣稱驗證了可信度的函式，會讓下一個人以為連結已經被查核過。
 */

/** Info: (20260820 - Julian) 只有這兩種協定可以進 `href` */
export const SAFE_URL_PROTOCOLS: readonly string[] = ["http:", "https:"];

/**
 * Info: (20260820 - Julian) 可否安全地放進 `href`。
 *
 * 不做 trim：呼叫端若允許前後空白，該由呼叫端決定（validator 的 `.trim()`
 * 在這一支之前跑）。在這裡偷偷 trim 會讓「驗過的字串」與「存進去的字串」
 * 不是同一個，而那是注入類問題最常見的縫。
 */
export const isSafeHttpUrl = (value: string): boolean => {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return SAFE_URL_PROTOCOLS.includes(parsed.protocol);
};

/**
 * Info: (20260820 - Julian) 給畫面顯示的 host（`intranet.local`、`www.mol.gov.tw`）。
 * 解不出來時回 null —— 呼叫端那時本來就不該把它畫成連結。
 */
export const safeUrlHostOf = (value: string): string | null => {
  if (!isSafeHttpUrl(value)) return null;
  return new URL(value).host || null;
};
