/**
 * Info: (20260807 - Emily) 子代碼標籤的顯示寬度截斷
 * (issue_drafts/inventory_table_import/11_sankey_labels_and_density.md 的殘留驗收項)。
 *
 * 4dfc37cb8 把末端節點從 `2.1` 改成 `2.1 外購電力`,解決了「讀不出那是什麼」,
 * 但票裡預告的長度護欄沒有跟著落地 —— 而 mermaid 把標籤畫在節點右側,
 * 英文最長的一筆有 43 個字元,1024px 下會與相鄰節點疊字。
 */

import { describe, it, expect } from "@jest/globals";
import {
  displayWidth,
  formatIsoSubCategoryLabel,
  Iso14064SubCategory,
  Iso14064SubCategoryDetails,
} from "@/constants/iso14064_subcategory";
import { CARBON_SANKEY_LABEL_MAX_WIDTH } from "@/constants/carbon_report_charts";

describe("displayWidth", () => {
  it("should count fullwidth characters as two columns", () => {
    expect(displayWidth("abc")).toBe(3);
    expect(displayWidth("外購電力")).toBe(8);
    // Info: (20260807 - Emily) 全形括號也是兩欄,半形斜線是一欄
    expect(displayWidth("（甲/乙）")).toBe(3 * 2 + 1 + 2);
  });
});

describe("formatIsoSubCategoryLabel", () => {
  it("should keep the full label when no width limit is given", () => {
    expect(formatIsoSubCategoryLabel("2.1", "zh_tw")).toBe("2.1 外購電力");
    expect(formatIsoSubCategoryLabel("2.1", "en")).toBe(
      "2.1 Purchased electricity",
    );
  });

  it("should return unknown codes verbatim instead of inventing a name", () => {
    expect(formatIsoSubCategoryLabel("9.9", "zh_tw")).toBe("9.9");
    expect(
      formatIsoSubCategoryLabel("9.9", "en", CARBON_SANKEY_LABEL_MAX_WIDTH),
    ).toBe("9.9");
  });

  it("should leave every Chinese label untouched at the sankey budget", () => {
    /**
     * Info: (20260807 - Emily) 截斷是為了英文,不該波及中文。
     * 逐筆檢查而不是只測最長的一筆 —— 上限一旦被調小,這條會先響。
     */
    Object.keys(Iso14064SubCategoryDetails).forEach((code) => {
      const truncated = formatIsoSubCategoryLabel(
        code,
        "zh_tw",
        CARBON_SANKEY_LABEL_MAX_WIDTH,
      );
      expect(truncated).toBe(formatIsoSubCategoryLabel(code, "zh_tw"));
    });
  });

  it("should truncate the longest English label and keep it within budget", () => {
    const code = Iso14064SubCategory.PURCHASED_ENERGY;
    const full = formatIsoSubCategoryLabel(code, "en");
    expect(displayWidth(full)).toBeGreaterThan(CARBON_SANKEY_LABEL_MAX_WIDTH);

    const truncated = formatIsoSubCategoryLabel(
      code,
      "en",
      CARBON_SANKEY_LABEL_MAX_WIDTH,
    );
    expect(displayWidth(truncated)).toBeLessThanOrEqual(
      CARBON_SANKEY_LABEL_MAX_WIDTH,
    );
    expect(truncated).toMatch(/…$/);
  });

  it("should never drop the sub-code — it is the only way back to table 3.8", () => {
    /**
     * Info: (20260807 - Emily) 代碼是讀者回原文表3.8 逐格對照的唯一線索。
     * 名稱可以短,代碼不能缺 —— 少了它,標籤就是看得懂但查不到。
     */
    Object.keys(Iso14064SubCategoryDetails).forEach((code) => {
      ["zh_tw", "en", "ja", "ko"].forEach((language) => {
        const label = formatIsoSubCategoryLabel(
          code,
          language,
          CARBON_SANKEY_LABEL_MAX_WIDTH,
        );
        expect(label.startsWith(code)).toBe(true);
        expect(displayWidth(label)).toBeLessThanOrEqual(
          CARBON_SANKEY_LABEL_MAX_WIDTH,
        );
      });
    });
  });

  it("should fall back to the bare code when the budget cannot fit any name", () => {
    // Info: (20260807 - Emily) 寧可少了名稱,不要給一個半截的名稱
    expect(formatIsoSubCategoryLabel("2.1", "en", 5)).toBe("2.1");
  });
});
