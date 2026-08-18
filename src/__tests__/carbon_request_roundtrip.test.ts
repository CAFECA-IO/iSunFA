import {
  CARBON_REPORT_IDENTITY_MAX_ROWS,
  CarbonReportPdfRequestSchema,
} from "@/validators/carbon_report_pdf";
import { CARBON_REPORT_IDENTITY_FIELDS } from "@/lib/utils/carbon_report_identity";

/**
 * Info: (20260817 - Emily) 請求 schema 的往返測試
 * (`data/issue_drafts/open/39_identity_never_printed.md`)。
 *
 * ## 為什麼需要這一支
 *
 * 08-14 交付的查證識別四欄，**從來沒有印在任何一份紙上**。
 * 填寫面板對、工具列徽記對、`buildIdentityRows` 對、HTML 渲染對，
 * 四樣都有測試、四樣都通過 —— 而 `CarbonReportShellSchema` 沒有宣告 `identity`，
 * 於是 `z.object` 的預設行為（**strip 未知欄位**）把它安靜地拿掉了，
 * 而 `safeParse` 仍然回 `success: true`。
 *
 * 那個缺陷唯一指出來的地方是 `tsc`（`pdf_editor.tsx` 的 TS2353），
 * 而 `tsc --noEmit` 當時是紅的（184 個 jest 全域名稱的錯誤把它淹掉），
 * 而且不在任何一道閘門裡。**沒有任何測試守著它。**
 *
 * ## 判準：測「送進去的欄位有沒有原樣出來」，不是測「schema 長什麼樣」
 *
 * 斷言 schema 的形狀（例如 `expect(shape.identity).toBeDefined()`）
 * 只會在有人刪掉那一行時紅 —— 但它不會在有人**新增**一個前端會送、
 * schema 沒宣告的欄位時紅，而那才是實際發生過的方向。
 *
 * 所以這裡送一份「前端真的會送」的完整 payload，逐欄比對回來的值。
 * 新增欄位時這支測試會逼你同時更新兩邊 —— 那正是當初漏掉的動作。
 */

/**
 * Info: (20260817 - Emily) 這份 payload 必須與 `pdf_editor.tsx` 實際送出的形狀一致。
 * 那支元件是唯一的呼叫端（透過 `requestCarbonReportPdf`）。
 */
const FULL_REQUEST = {
  markdown: "# 標題\n\n內容",
  fileName: "Carbon_Report_Draft_test.pdf",
  title: "2023 年溫室氣體盤查報告書",
  shell: {
    brand: "iSunFA",
    internalDocument: "內部文件",
    systemReport: "系統報告",
    issuedAt: "2026/8/17",
    footerTitle: "溫室氣體盤查報告書（草稿）",
    footerText: "內容由 AI 逐段生成，經人工查核後方可定稿",
    tocTitle: "章節目錄",
    identity: [
      { label: "盤查年度", value: "2023" },
      { label: "編製單位", value: "高興昌鋼鐵股份有限公司" },
      { label: "查證機構", value: "未填寫" },
      { label: "發行日期", value: "2026/8/17" },
    ],
  },
} as const;

describe("CarbonReportPdfRequestSchema 往返", () => {
  it("accepts the full payload the client actually sends", () => {
    const parsed = CarbonReportPdfRequestSchema.safeParse(FULL_REQUEST);
    expect(parsed.success).toBe(true);
  });

  /**
   * Info: (20260817 - Emily) 這一條就是 08-14 那個缺陷的紅燈。
   * 拿掉 schema 的 `identity` 會讓它紅（逐條變異測試過）。
   */
  it("keeps every shell field the client sent — nothing gets stripped", () => {
    const parsed = CarbonReportPdfRequestSchema.parse(FULL_REQUEST);
    const sent = Object.keys(FULL_REQUEST.shell).sort();
    const kept = Object.keys(parsed.shell ?? {}).sort();
    expect(kept).toEqual(sent);
  });

  it("keeps the identity rows intact, in order and with their values", () => {
    const parsed = CarbonReportPdfRequestSchema.parse(FULL_REQUEST);
    expect(parsed.shell?.identity).toEqual([...FULL_REQUEST.shell.identity]);
  });

  /**
   * Info: (20260817 - Emily) 上限寫 8 而不是 4 是刻意的：欄位數由
   * `CARBON_REPORT_IDENTITY_FIELDS` 決定。這條守的是「加一欄不會被靜靜排掉」。
   */
  it("allows more identity rows than today's four", () => {
    const extended = {
      ...FULL_REQUEST,
      shell: {
        ...FULL_REQUEST.shell,
        identity: [
          ...FULL_REQUEST.shell.identity,
          { label: "GWP 版本", value: "IPCC AR6" },
          { label: "保證等級", value: "合理保證" },
        ],
      },
    };
    const parsed = CarbonReportPdfRequestSchema.parse(extended);
    expect(parsed.shell?.identity).toHaveLength(6);
  });

  /**
   * Info: (20260817 - Emily) schema 上限與實際欄位數的關係（PR review B1）。
   *
   * 與 A2 同一個形狀:上限與「實際有幾欄」是兩件事,schema 只擋失控輸入。
   * 差別在失效模式 —— 這裡寫太小的話 Zod 會硬性失敗（400），現場看得到,
   * 不像 `identity` 沒宣告那次被 `z.object` 靜靜 strip 掉。所以這一條是對稱性,不是閘門。
   *
   * 讀的是 validator 匯出的常數與實際的欄位陣列,兩邊都不是測試自己寫的數字。
   */
  it("keeps the schema ceiling clear of today's field count", () => {
    expect(CARBON_REPORT_IDENTITY_FIELDS.length).toBeLessThan(
      CARBON_REPORT_IDENTITY_MAX_ROWS,
    );
  });

  /**
   * Info: (20260817 - Emily) 行為面:目前的欄位數要放過,失控的量要拒絕。
   * 只斷言兩個數字的關係不夠 —— 有人把 `.max(...)` 改成字面值時那條仍然綠。
   */
  it("accepts one row per identity field, and rejects a runaway count", () => {
    const rows = (count: number): { label: string; value: string }[] =>
      Array.from({ length: count }, (_unused, index) => ({
        label: `欄位${index + 1}`,
        value: `值${index + 1}`,
      }));
    const withRows = (count: number): unknown => ({
      ...FULL_REQUEST,
      shell: { ...FULL_REQUEST.shell, identity: rows(count) },
    });

    expect(
      CarbonReportPdfRequestSchema.safeParse(
        withRows(CARBON_REPORT_IDENTITY_FIELDS.length),
      ).success,
    ).toBe(true);
    expect(CarbonReportPdfRequestSchema.safeParse(withRows(100)).success).toBe(
      false,
    );
  });

  /**
   * Info: (20260817 - Emily) 沒填的欄位仍然要留著。
   * `buildIdentityRows` 的立場是「永遠回四列，沒填的印佔位符」——
   * 藏起來的話「不適用」與「忘了填」在紙上同形，而這是一份查證文件。
   */
  it("keeps a row whose value is the placeholder", () => {
    const parsed = CarbonReportPdfRequestSchema.parse(FULL_REQUEST);
    expect(parsed.shell?.identity?.[2]).toEqual({
      label: "查證機構",
      value: "未填寫",
    });
  });
});
