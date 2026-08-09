/**
 * Info: (20260807 - Emily) 報告草稿的持久化不變式
 * (issue_drafts/inventory_table_import/12_charts_gone_after_reload.md)。
 *
 * 這一票的症狀是「重整之後桑基圖全部不見,其餘段落還在」——
 * 也就是**已經產出的成果**沒有被保存下來。以下兩件事各自都能造成它,
 * 而兩件事原本都沒有測試守著:
 * 1. 含圖表區塊的報告存進去、讀回來,錨點與 mermaid 原始碼必須完整。
 * 2. 超過欄位上限時必須是明確拒絕,而不是一個看不懂的 400。
 */

import { describe, it, expect } from "@jest/globals";
import { CarbonReportDataSchema } from "@/validators";
import { CARBON_REPORT_DRAFT_MAX_CONTENT_CHARS } from "@/constants/carbon_chatbot";
import { projectedEciesContentChars } from "@/lib/chatroom_ecies";
import {
  buildChartAnchorStart,
  CarbonChartTemplateEnum,
} from "@/constants/carbon_report_charts";

const CHART_BLOCK = [
  buildChartAnchorStart(CarbonChartTemplateEnum.IMPORTED_EMISSION_SANKEY),
  "```mermaid",
  "sankey-beta",
  "屏東分公司,範疇二,3325.02",
  "```",
].join("\n");

const buildReportData = (chartContent: string) => ({
  documentName: "溫室氣體盤查報告書",
  title: "2025 年度溫室氣體盤查報告書",
  section: "3.6",
  categories: [],
  totalEmissions: "8367.21",
  paragraphs: [
    {
      id: "ch3-6",
      chapterId: "ch3",
      code: "3.6",
      title: "3.6 排放量結果分析",
      content: chartContent,
      isCompleted: true,
      isVerified: false,
      isDataDriven: true,
    },
  ],
  rawMarkdown: `### 3.6 排放量結果分析\n\n${chartContent}\n`,
});

describe("carbon report draft persistence", () => {
  it("should round-trip a report that contains chart blocks with anchors intact", () => {
    const original = buildReportData(CHART_BLOCK);
    // Info: (20260807 - Emily) 保存路徑就是 JSON.stringify → 密文/明文 → 還原後 safeParse
    const restored = CarbonReportDataSchema.safeParse(
      JSON.parse(JSON.stringify(original)),
    );
    expect(restored.success).toBe(true);
    if (!restored.success) return;

    const paragraph = restored.data.paragraphs?.[0];
    expect(paragraph?.content).toContain(
      buildChartAnchorStart(CarbonChartTemplateEnum.IMPORTED_EMISSION_SANKEY),
    );
    expect(paragraph?.content).toContain("sankey-beta");
    // Info: (20260807 - Emily) rawMarkdown 是渲染優先來源:它掉了,圖就從畫面上消失
    expect(restored.data.rawMarkdown).toContain("sankey-beta");
    expect(restored.data.rawMarkdown).toBe(original.rawMarkdown);
  });

  it("should reject a rawMarkdown that exceeds the shared limit", () => {
    const oversized = buildReportData(CHART_BLOCK);
    oversized.rawMarkdown = "台".repeat(
      CARBON_REPORT_DRAFT_MAX_CONTENT_CHARS + 1,
    );
    expect(CarbonReportDataSchema.safeParse(oversized).success).toBe(false);
  });

  it("should project the ciphertext length exactly from UTF-8 bytes", () => {
    /**
     * Info: (20260808 - Luphia) `encryptedContent` = base64(iv 12B + 密文 + tag 16B),
     * base64 每 3 bytes 產 4 字元。投影必須與這個公式一致,
     * 否則預檢與伺服端上限之間又會出現縫隙。
     */
    expect(projectedEciesContentChars(0)).toBe(Math.ceil(28 / 3) * 4);
    const bytes = 1_000;
    expect(projectedEciesContentChars(bytes)).toBe(
      Math.ceil((12 + bytes + 16) / 3) * 4,
    );
  });

  it("should measure the encrypted-mode budget in UTF-8 bytes, not UTF-16 chars", () => {
    /**
     * Info: (20260808 - Luphia) 這是中文報告的回歸測試:中文字 1 個 `.length`
     * 佔 3 bytes,舊的固定倍率(1.4)用 `.length` 估,60 萬字的純中文內容
     * 會被預檢放行(600,000 < 2M ÷ 1.4),而實際密文 ≈ 240 萬字元,
     * 伺服端必然 400 —— 預檢形同虛設。以位元組計的投影必須把它擋下來。
     */
    const cjkChars = 600_000;
    const utf8Bytes = cjkChars * 3;
    expect(cjkChars).toBeLessThan(CARBON_REPORT_DRAFT_MAX_CONTENT_CHARS / 1.4);
    expect(projectedEciesContentChars(utf8Bytes)).toBeGreaterThan(
      CARBON_REPORT_DRAFT_MAX_CONTENT_CHARS,
    );
  });
});
