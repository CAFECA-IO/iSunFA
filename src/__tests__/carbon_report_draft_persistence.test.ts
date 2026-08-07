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
import {
  CARBON_REPORT_DRAFT_MAX_CONTENT_CHARS,
  CARBON_REPORT_DRAFT_ENCRYPTED_SIZE_RATIO,
} from "@/constants/carbon_chatbot";
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

  it("should leave headroom for ECIES expansion in the encrypted-mode budget", () => {
    /**
     * Info: (20260807 - Emily) 上限管的是密文長度,而前端手上只有明文。
     * 加密模式的明文預算必須嚴格小於上限,否則預檢會放行一份注定被 server 擋下的草稿 ——
     * 那正是「保存靜靜失敗」的其中一條路。
     */
    const encryptedBudget = Math.floor(
      CARBON_REPORT_DRAFT_MAX_CONTENT_CHARS /
        CARBON_REPORT_DRAFT_ENCRYPTED_SIZE_RATIO,
    );
    expect(CARBON_REPORT_DRAFT_ENCRYPTED_SIZE_RATIO).toBeGreaterThan(1);
    expect(encryptedBudget).toBeLessThan(CARBON_REPORT_DRAFT_MAX_CONTENT_CHARS);
  });
});
