/**
 * Info: (20260821 - Emily) 揭露框架的**單一視圖** —— 角色句、每節指引、外殼聲明
 * 三者只能一起變。
 *
 * ## 為什麼是一個物件而不是三個函式
 *
 * 框架流進三個地方:草稿 prompt 的角色句(比 guidance 更前面、每次呼叫都注入)、
 * 每節的撰寫目標(guidance)、文件外殼的聲明行。08-18 已經發生過一次分裂:
 * 角色句寫「IFRS S1/S2 對齊」而 guidance 依 ISO 14064-1 —— 兩句互相矛盾且框架句在前,
 * 模型收到的是精神分裂的指示(見 paragraph_draft.service.ts 那段註解)。
 *
 * 只提供 `getGuidance(id, framework)` 會把同一個 bug 反向重演:guidance 換了 IFRS,
 * 角色句還在說 ISO。**註解防不住兩句話的一致性,一個物件可以** ——
 * 三個欄位出自同一次函式呼叫,不存在「只換其中一個」的寫法。
 *
 * ## 兩個刻意的限制
 *
 * 1. `CARBON_REPORT_STANDARD` 的消費者只剩本檔(掃描測試釘住)。
 *    別處要標準名稱,一律經過視圖 —— 否則下一個「直接 import 常數」的地方
 *    就是下一個分裂點。
 * 2. `INVENTORY_ONLY` 的 `shellClaims` 是空陣列而不是 undefined:
 *    呼叫端一律 `claims.forEach(印出)`,不需要判 null ——
 *    「不印」是零個元素,不是一個特殊分支。
 */
import {
  CARBON_REPORT_STANDARD,
  CARBON_REPORT_OUTLINE,
  type ICarbonReportSection,
} from "@/constants/carbon_report_outline";
import { CARBON_REPORT_GUIDANCE_IFRS } from "@/constants/carbon_report_outline_ifrs";
import {
  CarbonDisclosureFrameworkEnum,
  FRAMEWORK_ALIGNMENT_PHRASE,
  FRAMEWORK_DISCLAIMER_PHRASE,
} from "@/constants/carbon_report_framework";

export interface ICarbonFrameworkView {
  /** Info: (20260821 - Emily) 草稿 prompt 角色句用的標準名稱 */
  standardLabel: string;
  /** Info: (20260821 - Emily) 該節要餵給模型的撰寫目標;節不存在回 undefined */
  guidanceOf: (sectionId: string) => string | undefined;
  /**
   * Info: (20260821 - Emily) 文件外殼要印的聲明行,**依序印出、一行都不能少**。
   * IFRS 時是〔架構對齊聲明, 免責句〕—— 順序固定,免責句必須緊跟著聲明,
   * 分開印會讓讀者先看到聲明、把「架構對齊」讀成「合規」。
   */
  shellClaims: ReadonlyArray<string>;
}

export const carbonFrameworkView = (
  framework: CarbonDisclosureFrameworkEnum,
): ICarbonFrameworkView => {
  const bySectionId = new Map<string, ICarbonReportSection>(
    CARBON_REPORT_OUTLINE.map((section) => [section.id, section]),
  );

  if (framework === CarbonDisclosureFrameworkEnum.IFRS_S1_S2) {
    return {
      /*
       * Info: (20260821 - Emily) 角色句不寫「依 IFRS 編製的盤查報告書」——
       * IFRS S1/S2 是揭露框架不是盤查標準,計算與查證仍然是 ISO 14064-1。
       * 角色句講兩層:依 ISO 盤查、依 IFRS 架構揭露。
       */
      standardLabel: `${CARBON_REPORT_STANDARD}(盤查)並依 IFRS S1/S2 之架構揭露`,
      guidanceOf: (sectionId) => CARBON_REPORT_GUIDANCE_IFRS[sectionId],
      shellClaims: [FRAMEWORK_ALIGNMENT_PHRASE, FRAMEWORK_DISCLAIMER_PHRASE],
    };
  }

  return {
    standardLabel: CARBON_REPORT_STANDARD,
    guidanceOf: (sectionId) => bySectionId.get(sectionId)?.guidance,
    shellClaims: [],
  };
};
