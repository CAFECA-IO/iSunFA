import fs from "fs";
import path from "path";
import { describe, it, expect } from "@jest/globals";
import { carbonFrameworkView } from "@/lib/carbon_framework_view";
import {
  CARBON_REPORT_OUTLINE,
  CARBON_REPORT_STANDARD,
} from "@/constants/carbon_report_outline";
import { CARBON_REPORT_GUIDANCE_IFRS } from "@/constants/carbon_report_outline_ifrs";
import {
  CarbonDisclosureFrameworkEnum,
  FRAMEWORK_ALIGNMENT_PHRASE,
  FRAMEWORK_DISCLAIMER_PHRASE,
} from "@/constants/carbon_report_framework";

/**
 * Info: (20260821 - Emily) 框架視圖:角色句、每節指引、外殼聲明三者只能一起變。
 * 08-18 發生過角色句與 guidance 各說各話(IFRS vs ISO,矛盾且框架句在前),
 * 這支測試釘住「同一個視圖的三個欄位屬於同一個框架」。
 */
describe("carbonFrameworkView", () => {
  const inventory = carbonFrameworkView(
    CarbonDisclosureFrameworkEnum.INVENTORY_ONLY,
  );
  const ifrs = carbonFrameworkView(CarbonDisclosureFrameworkEnum.IFRS_S1_S2);

  describe("INVENTORY_ONLY(預設,行為與改動前一致)", () => {
    it("角色句就是既有的盤查標準,不含 IFRS", () => {
      expect(inventory.standardLabel).toBe(CARBON_REPORT_STANDARD);
      expect(inventory.standardLabel).not.toContain("IFRS");
    });

    it("每一節的 guidance 與大綱常數逐節相同", () => {
      CARBON_REPORT_OUTLINE.forEach((section) => {
        expect(inventory.guidanceOf(section.id)).toBe(section.guidance);
      });
    });

    it("外殼聲明是零個元素,不是 undefined(呼叫端不需要判 null)", () => {
      expect(inventory.shellClaims).toEqual([]);
    });
  });

  describe("IFRS_S1_S2", () => {
    it("角色句同時講兩層:ISO 盤查、IFRS 架構揭露", () => {
      expect(ifrs.standardLabel).toContain(CARBON_REPORT_STANDARD);
      expect(ifrs.standardLabel).toContain("IFRS S1/S2");
      /*
       * Info: (20260821 - Emily) 「架構」兩個字承重:角色句寫「依 IFRS 編製」
       * 就是把揭露框架講成盤查標準 —— 那正是 08-18 那句被拔掉的話的形狀。
       */
      expect(ifrs.standardLabel).toContain("架構");
    });

    it("每一節的 guidance 換成揭露版,而且一節都不缺", () => {
      CARBON_REPORT_OUTLINE.forEach((section) => {
        expect(ifrs.guidanceOf(section.id)).toBe(
          CARBON_REPORT_GUIDANCE_IFRS[section.id],
        );
        expect(ifrs.guidanceOf(section.id)).toBeDefined();
      });
    });

    it("外殼聲明是〔對齊聲明, 免責句〕,順序固定", () => {
      expect(ifrs.shellClaims).toEqual([
        FRAMEWORK_ALIGNMENT_PHRASE,
        FRAMEWORK_DISCLAIMER_PHRASE,
      ]);
    });

    /**
     * Info: (20260821 - Emily) 視圖的產出必須通過我們自己的驗收判準 ——
     * shellClaims 印上紙之後,「宣告架構對齊卻沒有免責句」與「紙上有合規宣告」
     * 兩條都要綠。這裡直接用判準函式驗,不重寫一份規則。
     */
    it("shellClaims 印上紙之後通過驗收判準(自洽)", async () => {
      const { auditFrameworkClaims } =
        await import("@/lib/utils/carbon_framework_claims");
      const audit = auditFrameworkClaims(ifrs.shellClaims.join("\n"));

      expect(audit.alignmentDeclared).toBe(true);
      expect(audit.disclaimerPresent).toBe(true);
      expect(audit.alignmentWithoutDisclaimer).toEqual([]);
      expect(audit.complianceClaims).toEqual([]);
    });
  });

  /**
   * Info: (20260821 - Emily) 第一版斷言「33 節全不同」,紅了 2 節 —— 量出來
   * `ch4-intro` 與 `ch10-intro` 在老闆的兩份原稿裡**本來就同文**(一句話的短節,
   * 內控與法律責任的敘述兩個框架下確實一樣)。那是原稿的性質,不是接線錯誤
   * (接線由上面的逐節 toBe 釘死)。
   *
   * 所以改成**具名例外**而不是調弱成 greaterThan:第三節變同文
   * (最可能的原因是有人把 ISO 版複製進 IFRS 檔)時,這條照樣紅。
   * 例外清單只能變短。
   */
  it("除了兩節原稿同文的例外,其餘每一節的 guidance 都不同", () => {
    const IDENTICAL_BY_SOURCE: ReadonlyArray<string> = [
      "ch4-intro",
      "ch10-intro",
    ];
    const identical = CARBON_REPORT_OUTLINE.filter(
      (section) =>
        inventory.guidanceOf(section.id) === ifrs.guidanceOf(section.id),
    ).map((section) => section.id);

    expect(identical.sort()).toEqual([...IDENTICAL_BY_SOURCE].sort());
  });

  it("不存在的節回 undefined(兩個框架一致)", () => {
    expect(inventory.guidanceOf("ch99")).toBeUndefined();
    expect(ifrs.guidanceOf("ch99")).toBeUndefined();
  });
});

/**
 * Info: (20260821 - Emily) 機械化掃描:`CARBON_REPORT_STANDARD` 的生產端消費者
 * 只剩框架視圖。別處要標準名稱一律經過視圖 —— 直接 import 常數的地方
 * 就是下一個「guidance 換了、角色句沒換」的分裂點。
 *
 * 允許清單:定義處、視圖本身。測試檔與本檔不算生產端。
 */
describe("CARBON_REPORT_STANDARD 沒有第二個生產端消費者", () => {
  const ALLOWED: ReadonlyArray<string> = [
    "src/constants/carbon_report_outline.ts",
    "src/lib/carbon_framework_view.ts",
    // Info: (20260821 - Emily) framework 常數檔的檔頭**註解**提到它(三層說明),不是程式引用
    "src/constants/carbon_report_framework.ts",
  ];

  it("掃 src/ 全樹(不含測試),引用者都在允許清單裡", () => {
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "__tests__") return;
          walk(full);
          return;
        }
        if (!/\.(ts|tsx)$/.test(entry.name)) return;
        const relative = full.split(path.sep).join("/");
        if (ALLOWED.some((allowed) => relative.endsWith(allowed))) return;
        const code = fs.readFileSync(full, "utf-8");
        if (code.includes("CARBON_REPORT_STANDARD")) offenders.push(relative);
      });
    };
    walk(path.join(process.cwd(), "src"));

    expect(offenders).toEqual([]);
  });
});
