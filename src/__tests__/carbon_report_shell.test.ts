import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";
import {
  buildCarbonReportShell,
  toPdfRequestShell,
  CARBON_REPORT_SHELL_VENDOR,
} from "@/lib/utils/carbon_report_shell";
import { carbonFrameworkView } from "@/lib/carbon_framework_view";
import { CarbonDisclosureFrameworkEnum } from "@/constants/carbon_report_framework";
import { buildCarbonReportHtml } from "@/lib/utils/carbon_report_html";

/**
 * Info: (20260909 - Emily) 預覽與下載的文件外殼要**同源**(#6761)。
 *
 * 原本兩份實作:伺服端 `carbon_report_html` 與預覽 `pdf_editor` 的 JSX,各自從 i18n 取字,
 * 而且內容不同 —— 下載的 PDF 第一頁有報告名稱、四列識別欄位、揭露聲明行,預覽三塊都沒有。
 * 這一組守的是:(1) 外殼資料由一支純函式產出;(2) 預覽 JSX 只從那個物件讀;
 * (3) 伺服端 HTML 印的就是那個物件的欄位;(4) 那句「下載的內容就是預覽所見」改成真的。
 */
const read = (relativePath: string): string =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf-8");

const stripComments = (source: string): string =>
  source
    .replace(/\{\s*\/\*(?:(?!\*\/)[\s\S])*\*\/\s*\}/g, "")
    .replace(/\/\*(?:(?!\*\/)[\s\S])*\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const t = (key: string, vars?: Record<string, string | number>): string =>
  vars ? `${key}:${JSON.stringify(vars)}` : key;

const NOW = new Date("2026-09-09T08:00:00.000Z");

describe("外殼資料由一支純函式產出", () => {
  it("七個文案欄位全部從 i18n 取,日期注入而非內部 new Date()", () => {
    const shell = buildCarbonReportShell({ t, now: NOW });
    expect(shell.brand).toBe("admin_mission_board.pdf_editor.brand");
    expect(shell.internalDocument).toBe(
      "admin_mission_board.pdf_editor.internal_document",
    );
    expect(shell.systemReport).toBe(
      "admin_mission_board.pdf_editor.system_report",
    );
    expect(shell.footerTitle).toBe(
      "admin_mission_board.pdf_editor.footer_title",
    );
    expect(shell.footerText).toContain('"year":2026');
    expect(shell.tocTitle).toBe("carbon_chatbot.outline_title");
    expect(shell.issuedAt).toBe(NOW.toLocaleDateString().replace(/-/g, "/"));
  });

  it("報告名稱空字串即不印;識別欄位一項都沒有即整區不印", () => {
    const empty = buildCarbonReportShell({
      t,
      now: NOW,
      reportTitle: "   ",
      identityRows: [],
    });
    expect(empty.title).toBeUndefined();
    expect(empty.identity).toBeUndefined();
    const filled = buildCarbonReportShell({
      t,
      now: NOW,
      reportTitle: "高興昌 2024 盤查報告",
      identityRows: [{ label: "盤查年度", value: "2024" }],
    });
    expect(filled.title).toBe("高興昌 2024 盤查報告");
    expect(filled.identity).toEqual([{ label: "盤查年度", value: "2024" }]);
  });

  it("聲明行從 carbonFrameworkView 導,與伺服端同一份常數(不手寫第二份)", () => {
    /**
     * Info: (20260909 - Emily) #6688-C 的界:印出的與驗收比對的必須是同一份常數。
     * 預覽要顯示它,所以客戶端也導 —— 但導的是同一個 view,這條釘住它不會變成手寫字串。
     */
    const ifrs = buildCarbonReportShell({
      t,
      now: NOW,
      framework: CarbonDisclosureFrameworkEnum.IFRS_S1_S2,
    });
    expect(ifrs.claims).toEqual(
      carbonFrameworkView(CarbonDisclosureFrameworkEnum.IFRS_S1_S2).shellClaims,
    );
    expect(ifrs.claims).toHaveLength(2);
    const inventoryOnly = buildCarbonReportShell({ t, now: NOW });
    expect(inventoryOnly.claims).toEqual([]);
  });

  it("送伺服端的那份 = 同一個物件去掉 claims(其餘欄位一字不差)", () => {
    const shell = buildCarbonReportShell({
      t,
      now: NOW,
      reportTitle: "報告",
      identityRows: [{ label: "a", value: "b" }],
      framework: CarbonDisclosureFrameworkEnum.IFRS_S1_S2,
    });
    const request = toPdfRequestShell(shell);
    expect(request).not.toHaveProperty("claims");
    const { claims, ...rest } = shell;
    void claims;
    expect(request).toEqual(rest);
  });
});

describe("預覽 JSX 只從 shell 物件讀(不再有第二份外殼)", () => {
  const editor = read("src/components/pdf_tool/pdf_editor.tsx");
  const code = stripComments(editor);
  // Info: (20260909 - Emily) JSX 區:從 A4 容器開始到 Share Link Modal 之前
  const jsxStart = code.indexOf('id="pdf-content"');
  const jsxEnd = code.indexOf("<PdfShareLinkModal");
  const jsx = code.slice(jsxStart, jsxEnd);

  it("頁首、標籤、日期、頁尾全部讀 shell.*,JSX 裡沒有任何一個 pdf_editor.* 的 t() 呼叫", () => {
    expect(jsxStart).toBeGreaterThan(-1);
    expect(jsxEnd).toBeGreaterThan(jsxStart);
    expect(jsx).toContain("{shell.brand}");
    expect(jsx).toContain("{shell.internalDocument}");
    expect(jsx).toContain("{shell.systemReport}");
    expect(jsx).toContain("{shell.issuedAt}");
    expect(jsx).toContain("{shell.footerTitle}");
    expect(jsx).toContain("{shell.footerText}");
    expect(jsx).toContain("{CARBON_REPORT_SHELL_VENDOR}");
    expect(jsx).not.toMatch(
      /t\("admin_mission_board\.pdf_editor\.(brand|internal_document|system_report|footer_title|footer_text)"/,
    );
    expect(jsx).not.toMatch(/new Date\(\)\.toLocaleDateString/);
  });

  it("下載第一頁有的三塊預覽也有:報告名稱、四列識別欄位、聲明行", () => {
    expect(jsx).toMatch(/\{shell\.title && \(/);
    expect(jsx).toMatch(/shell\.identity\.map\(/);
    expect(jsx).toMatch(/shell\.claims\.map\(/);
  });

  it("下載送的是同一個 shell 物件(toPdfRequestShell),不再 inline 另組一份", () => {
    expect(code).toContain("shell: toPdfRequestShell(shell),");
    expect(code.split("buildCarbonReportShell(").length - 1).toBe(1);
    // Info: (20260909 - Emily) 舊形狀:downloadViaServer 裡 inline 的 `shell: { brand: t(...` 物件
    expect(code).not.toMatch(/shell:\s*\{\s*brand:/);
  });
});

describe("伺服端 HTML 印的就是那個物件的欄位", () => {
  it("同一個 shell 餵 buildCarbonReportHtml,標題、識別欄位、聲明行、供應商字都在紙上", () => {
    const shell = buildCarbonReportShell({
      t,
      now: NOW,
      reportTitle: "高興昌 2024 盤查報告",
      identityRows: [{ label: "盤查年度", value: "2024" }],
      framework: CarbonDisclosureFrameworkEnum.IFRS_S1_S2,
    });
    const html = buildCarbonReportHtml("## 3.1 排放源\n\n內容", shell);
    expect(html).toContain("高興昌 2024 盤查報告");
    expect(html).toContain("<dt>盤查年度</dt>");
    expect(html).toContain("<dd>2024</dd>");
    shell.claims.forEach((line) => expect(html).toContain(line));
    expect(html).toContain(CARBON_REPORT_SHELL_VENDOR);
  });
});

describe("那句文案改成真的", () => {
  it("五語系不再說「下載的內容就是預覽所見」,而是說「相同,另加目錄與頁碼」", () => {
    /**
     * Info: (20260909 - Emily) 目錄與頁碼只有列印那條路有(預覽沒有分頁),所以「一模一樣」仍然不對;
     * 說得準確:內容相同,另加目錄與頁碼。
     */
    const forbidden = [
      "下載的內容就是預覽所見",
      "下载的内容就是预览所见",
      "exactly what the preview shows",
      "そのまま出力されます",
      "그대로 출력됩니다",
    ];
    ["zh_tw", "zh_cn", "en", "ja", "ko"].forEach((locale) => {
      const source = read(`src/i18n/locales/${locale}/common.ts`);
      const start = source.indexOf("pdf_download_needs_preview:");
      expect(start).toBeGreaterThan(-1);
      const line = source.slice(start, start + 400);
      forbidden.forEach((phrase) => expect(line).not.toContain(phrase));
    });
  });
});
