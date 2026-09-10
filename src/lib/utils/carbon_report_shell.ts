// Info: (20260909 - Emily) 碳盤查報告的文件外殼 —— 預覽與下載共用的**同一份資料**(#6761)

import type { ICarbonPdfShell } from "@/lib/utils/carbon_report_pdf_client";
import { CarbonDisclosureFrameworkEnum } from "@/constants/carbon_report_framework";
import { carbonFrameworkView } from "@/lib/carbon_framework_view";

/**
 * Info: (20260909 - Emily) 頁首那行的供應商字。原本伺服端 `carbon_report_html` 與預覽 JSX 各寫一份字面值,
 * 這裡收成一個;兩端都從這裡拿。
 */
export const CARBON_REPORT_SHELL_VENDOR = "iSunFA Enterprise Solutions";

/**
 * Info: (20260909 - Emily) 文件外殼的完整資料:送伺服端列印的那份(`ICarbonPdfShell`)加上聲明行。
 *
 * ## 為什麼要有這一支(#6761)
 *
 * 外殼原本有**兩份實作**:伺服端 `carbon_report_html` 的 `shellHeader` / `shellFooter`,
 * 與 `pdf_editor` 預覽自己的 JSX。兩份各自從 i18n 取字,而且**內容不一樣**——
 * 下載的 PDF 第一頁有報告名稱、四列識別欄位、揭露聲明行,預覽三塊都沒有。
 * 而錯誤文案 `pdf_download_needs_preview` 寫的是「下載的內容就是預覽所見」。
 * 使用者在畫面上檢查完按下載,拿到一份多了三塊他沒看過的東西的文件 ——
 * 其中一塊是查證單位會讀的合規聲明。
 *
 * 這一支把**資料**收成一份:預覽渲染它、下載送它(伺服端只補 logo,聲明行由同一個
 * `carbonFrameworkView` 再導一次並審過)。兩端渲染仍各自做(列印用 mm 單位與 `break-inside`,
 * 預覽是 tailwind),但它們印的東西**不可能不一樣**,因為都只認這一個物件。
 * 有測試釘住「預覽 JSX 只從 shell 讀、不再直接叫 t()」。
 *
 * ## 聲明行為什麼這裡也導
 *
 * #6688-C 的立場是「客戶端只送 enum,聲明行由伺服端導出」——那是為了讓**印出的**與
 * **驗收比對的**是同一份常數。這裡導的仍是那同一份常數(`carbonFrameworkView(...).shellClaims`),
 * 不是手寫第二份字串;預覽要讓使用者在按下載之前就看到那兩句,尤其是「不得只印對齊聲明而缺免責句」
 * 這條配對規則 —— 使用者要能自己確認那份紙合不合規。
 */
export interface ICarbonReportShellData extends ICarbonPdfShell {
  claims: ReadonlyArray<string>;
}

export interface ICarbonReportShellInput {
  /** Info: (20260909 - Emily) i18n;文案由呼叫端的語言決定,伺服端不知道使用者的地區設定 */
  t: (
    key: string,
    vars?: Record<string, string | number>,
  ) => string | undefined;
  /** Info: (20260909 - Emily) 注入而不在裡面 `new Date()`:同一次渲染與同一次下載要拿到同一個日期 */
  now: Date;
  reportTitle?: string;
  identityRows?: ReadonlyArray<{ label: string; value: string }>;
  framework?: CarbonDisclosureFrameworkEnum;
}

/**
 * Info: (20260909 - Emily) 日期格式與 9/09 之前預覽 JSX 用的同一個寫法,不改變使用者看到的樣子。
 */
export const formatShellIssuedAt = (now: Date): string =>
  now.toLocaleDateString().replace(/-/g, "/");

export const buildCarbonReportShell = (
  input: ICarbonReportShellInput,
): ICarbonReportShellData => {
  const { t, now, reportTitle, identityRows, framework } = input;
  return {
    brand: t("admin_mission_board.pdf_editor.brand") ?? "",
    internalDocument:
      t("admin_mission_board.pdf_editor.internal_document") ?? "",
    systemReport: t("admin_mission_board.pdf_editor.system_report") ?? "",
    issuedAt: formatShellIssuedAt(now),
    footerTitle: t("admin_mission_board.pdf_editor.footer_title") ?? "",
    footerText:
      t("admin_mission_board.pdf_editor.footer_text", {
        year: now.getFullYear(),
      }) ?? "",
    /**
     * Info: (20260812 - Emily) 目錄抬頭沿用側欄那顆按鈕的字,兩處指的是同一份東西。
     */
    tocTitle: t("carbon_chatbot.outline_title") ?? "",
    /**
     * Info: (20260812 - Emily) 報告名稱。空字串即不印:沒有名稱是一眼看得出來的缺漏,
     * 而一個猜出來的名稱印在查證文件的封面上會被當成事實。
     */
    title:
      reportTitle && reportTitle.trim().length > 0 ? reportTitle : undefined,
    /**
     * Info: (20260814 - Emily) 一項都沒有就整區不印(公開分享頁那種場合);
     * 有的話一律四列,包含沒填的 —— 藏起來的話「不適用」與「忘了填」同形。
     */
    identity:
      identityRows && identityRows.length > 0 ? identityRows : undefined,
    claims: carbonFrameworkView(
      framework ?? CarbonDisclosureFrameworkEnum.INVENTORY_ONLY,
    ).shellClaims,
  };
};

/**
 * Info: (20260909 - Emily) 送伺服端列印的那份:同一個物件**去掉 claims**。
 *
 * 不是伺服端不印聲明行 —— 它會從同一個 `framework` 用同一個 `carbonFrameworkView` 再導一次,
 * 而且**審過**(`gatePaperClaims`)才印。客戶端送字串過去,伺服端就得決定信不信它;
 * 送 enum 讓伺服端自己導,審的與印的必然是同一份。這是 #6688-C 定下的界,這裡不動它。
 */
export const toPdfRequestShell = (
  shell: ICarbonReportShellData,
): ICarbonPdfShell => {
  const { claims, ...requestShell } = shell;
  void claims;
  return requestShell;
};
