/**
 * Info: (20260818 - Emily) 大綱 guidance 的標準一致性不變式
 * （`data/issue_drafts/open/44_iso_standard_alignment.md`,上線阻擋 B2）。
 *
 * ## 為什麼這是一條測試而不是一次檢查
 *
 * `guidance` 不是給人看的文案 —— 它是**注入 prompt 的東西**（大綱檔頭第 2 行）。
 * 它寫錯標準,產出的報告就會宣告錯的標準:`ch1-intro` 原本叫模型聲明
 * 「符合 IFRS S1/S2」,而客戶要的是 ISO 14064-1。那是合規問題,不是措辭問題。
 *
 * 08-18 改的時候發現票上的清單本身是錯的:票說 8 條、列了 9 條,
 * 實際 grep 出來是 **12 條**（漏了 `ch1-4`、`ch3-6`、`ch6`）。
 * 那正是「靠人眼列清單」的失效方式 —— 所以判準要是一條跑得動的測試,
 * 而不是一份數過的名單。改完之後這支會擋住任何一條寫回舊標準的 guidance。
 *
 * ## 判準讀的是 constants,不是這裡寫死的字串
 *
 * 六大類別的標準名稱在 `IsoCategoryDetails`（`src/constants/esg.ts`,08-06 就有）。
 * 這支測試從那裡讀,不自己寫一份 —— 自己寫一份的話,哪天有人改了標準名稱,
 * 這支測試會繼續綠著,而 guidance 與 constants 已經分岔。
 */
import { describe, it, expect } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import {
  CARBON_REPORT_CHAPTERS,
  CARBON_REPORT_OUTLINE,
  CARBON_REPORT_SECTION_COUNT,
  CARBON_REPORT_STANDARD,
  CARBON_VERIFICATION_STANDARD,
} from "@/constants/carbon_report_outline";
import { solutions as solutionsEn } from "@/i18n/locales/en/solutions";
import { solutions as solutionsJa } from "@/i18n/locales/ja/solutions";
import { solutions as solutionsKo } from "@/i18n/locales/ko/solutions";
import { solutions as solutionsZhCn } from "@/i18n/locales/zh_cn/solutions";
import { solutions as solutionsZhTw } from "@/i18n/locales/zh_tw/solutions";
import { CARBON_REPORT_GUIDANCE_IFRS } from "@/constants/carbon_report_outline_ifrs";
import { COMPLIANCE_CLAIM_PATTERNS } from "@/constants/carbon_report_framework";
import { squeezeForMatch } from "@/lib/utils/squeeze_for_match";
import { Iso14064Category, IsoCategoryDetails } from "@/constants/esg";

/**
 * Info: (20260818 - Emily) 不得出現在任何 guidance 裡的標準名稱。
 *
 * `範疇一/二/三` 是 GHG Protocol 的分類制。它本身不是錯的 ——
 * 錯的是**要模型把 ISO 類別制的原文改寫成它**。實測 08-17:`2.3 排放範疇與類別劃分`
 * 的正文只有 65 字、`表2.2` 被丟掉、結構圖只抽到 2 個節點,
 * 而 log 裡原文的「類別二：輸入能源的間接溫室氣體排放量」寫得很清楚。
 * 一節三個產出同時失敗,成因是 guidance 要它換一套分類制。
 */
const FORBIDDEN_STANDARDS: ReadonlyArray<{
  readonly pattern: RegExp;
  readonly why: string;
}> = [
  {
    pattern: /IFRS/,
    why: "IFRS S1/S2 是財務永續揭露準則,不是溫室氣體盤查標準",
  },
  {
    pattern: /GHG Protocol/,
    why: "對外承諾的是 ISO 14064-1,不是 GHG Protocol",
  },
  { pattern: /範疇[一二三]/, why: "ISO 14064-1 用類別一~六,不用範疇制" },
];

/**
 * Info: (20260818 - Emily) 這一份**盤查報告**不問的題目 —— 氣候財務揭露(IFRS S2 / TCFD)式的題目。
 *
 * `FORBIDDEN_STANDARDS` 擋的是**標準名稱**,這裡擋的是**題目**。兩者要分開:
 * `ch6` 原本問實體風險與轉型風險、`ch7` 問氣候情境分析,兩條都沒有寫到 IFRS 三個字母,
 * 所以名稱那一組放它們過去 —— 而那正是這次靠人眼才發現的兩節。
 *
 * 下面「對得上自己的標題」那一組是正面判準(要提到自己的題目),
 * 這一組是負面判準(不准提到別人的題目)。正面的擋得住寫錯的那一節,
 * 負面的擋得住**同一個錯搬到別的一節** —— 而那才是它會復發的方式。
 *
 * ⚠ 層次不要讀反了:這些題目**不是**「不該存在於產品」的題目。
 * IFRS S1/S2 是法規強制的揭露框架(金管會分梯適用),ISO 14064-1 是它底下的盤查/查證標準。
 * 實體風險、轉型風險、情境分析在 IFRS S2 的章節裡是**必要內容**;
 * 它們錯的地方只是被塞進標題在問「盤查作業」與「內部查證」的兩節。
 *
 * 因此判準的範圍必須跟著標題走,不能是全域黑名單 —— 全域黑名單會讓
 * 「未來新增 IFRS S2 揭露章節」這件事被這條測試擋住,而擋住的理由是錯的。
 * `DISCLOSURE_CHAPTER_IDS` 列出允許問這些題目的章節;新增揭露章節時把 id 加進來,
 * 而不是把上面那份清單刪掉。
 */
const OFF_TOPIC_SUBJECTS: ReadonlyArray<string> = [
  "實體風險",
  "轉型風險",
  "情境分析",
  "Climate Scenario",
  // Info: (20260819 - Emily) 08-19 補上的四項。原本的清單只列風險與情境,
  // 於是 `ch5` 的 guidance 用「轉型計畫」而不是「轉型風險」,整條判準從旁邊繞過去了
  // —— 判準比它要守的東西窄,本週第六次同一個形狀。
  //
  // 「碳權」刻意不列:ISO 14064-1 的減量措施一節本來就可能談抵換,
  // 把它列進來會讓判準比它要守的東西寬(另一個方向的同一個錯)。
  "轉型計畫",
  "Transition Plan",
  "SBTi",
  "財務資源",
];

/**
 * Info: (20260818 - Emily) 允許問氣候財務揭露題目的章節 id。
 *
 * 目前是空的 —— 這份大綱只有盤查報告的章節,**一節都沒有**在做 IFRS S2 揭露。
 * 那是既有的缺口(不是 08-18 拿掉的;`ch6`/`ch7` 的標題一直都是盤查與查證),
 * 但在 IFRS S1/S2 分梯強制上路之後,它是一個要進票的產品缺口。
 */
const DISCLOSURE_CHAPTER_IDS: ReadonlyArray<string> = [];

const guidanceOf = (id: string): string => {
  const section = CARBON_REPORT_OUTLINE.find((item) => item.id === id);
  if (section === undefined) throw new Error(`大綱沒有 ${id} 這一節`);
  return section.guidance ?? "";
};

describe("CARBON_REPORT_OUTLINE 的標準一致性", () => {
  it("每一節都有 id 與 guidance,且 id 不重複", () => {
    const ids = CARBON_REPORT_OUTLINE.map((section) => section.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(
      CARBON_REPORT_OUTLINE.filter(
        (section) => (section.guidance ?? "").trim().length === 0,
      ).map((section) => section.id),
    ).toEqual([]);
  });

  /**
   * Info: (20260818 - Emily) 這一條是 B2 的閘門。
   * 失敗訊息要指名是哪一節、撞到哪一條 —— 只說「有 3 處」的話,
   * 下一個人得自己 grep 一遍,而那正是這次會漏掉三條的原因。
   */
  it.each(FORBIDDEN_STANDARDS)(
    "沒有任何 guidance 提到 $pattern",
    ({ pattern, why }) => {
      const offenders = CARBON_REPORT_OUTLINE.filter((section) =>
        pattern.test(section.guidance ?? ""),
      ).map((section) => `${section.id}(${section.code})`);

      expect(offenders).toEqual([]);
      expect(why.length).toBeGreaterThan(0);
    },
  );

  /**
   * Info: (20260818 - Emily) 符合性聲明是 ISO 14064-1 的必載項目。
   * 只斷言「沒有 IFRS」不夠 —— 把那句話整段刪掉也會綠,而報告就少了必載項。
   */
  it("導論要求模型聲明依據 ISO 14064-1 編製", () => {
    const guidance = guidanceOf("ch1-intro");

    expect(guidance).toContain("ISO 14064-1");
    expect(guidance).toContain("符合性聲明");
  });

  /**
   * Info: (20260818 - Emily) 六大類別的名稱讀 `IsoCategoryDetails`,不寫死。
   *
   * 標準名稱的形式是「類別一：直接溫室氣體排放與移除」,
   * guidance 裡寫成「類別一(直接溫室氣體排放與移除)」——
   * 冒號與括號不同,所以比對的是**冒號後面的本體**加上「類別N」兩件事。
   */
  it("排放範疇與類別劃分那一節,逐一列出 ISO 六大類別的標準名稱", () => {
    const guidance = guidanceOf("ch2-3");

    Object.values(Iso14064Category).forEach((category) => {
      const [shortLabel, fullName] =
        IsoCategoryDetails[category].nameZh.split("：");

      expect(guidance).toContain(shortLabel);
      expect(guidance).toContain(fullName);
    });
  });

  // Info: (20260818 - Emily) 查證準則要指名 ISO 14064-3;沒有年份的話「哪一版」在報告上說不清楚
  it("查證遵循準則那一節指名 ISO 14064-3", () => {
    expect(guidanceOf("ch9-2")).toContain("ISO 14064-3");
  });

  /**
   * Info: (20260818 - Emily) 保證等級不得預設。
   *
   * 原本的 guidance 寫「通常…範疇一、二採合理確信,範疇三採有限確信」——
   * 那是叫模型**替客戶決定**一件只有查證機構能決定的事。
   * 一份查證文件上寫錯保證等級,比空著更糟。
   */
  it("保證等級那一節要求照原文填寫,不預設等級", () => {
    const guidance = guidanceOf("ch9-4");

    expect(guidance).toContain("不要預設");
    expect(guidance).not.toMatch(/通常/);
  });

  /**
   * Info: (20260818 - Emily) ISO 14064-1 明訂要分列的三件事,各自要有落點。
   * 這條守的是「必載項目有沒有人問模型」,而不是產出對不對 ——
   * 產出那一端由驗收腳本看紙上有沒有。
   */
  it.each([
    {
      id: "ch2-2",
      keyword: "排除理由",
      why: "經鑑別但未量化的排放源要敘明排除理由",
    },
    { id: "ch3-3", keyword: "GWP", why: "GWP 版本與來源是必載項目" },
    { id: "ch3-4", keyword: "生物源", why: "生質碳的排放與移除要與化石源分列" },
    { id: "ch3-6", keyword: "移除量", why: "removals 要與排放量分列" },
  ])("$id 的 guidance 問到「$keyword」", ({ id, keyword }) => {
    expect(guidanceOf(id)).toContain(keyword);
  });

  /**
   * Info: (20260818 - Emily) guidance 要問這一節自己的題目。
   *
   * 08-18 發現 `ch6`(標題「溫室氣體資訊管理及盤查作業」)的 guidance 問的是
   * 氣候實體風險與轉型風險,`ch7`(標題「溫室氣體內部查證及定期審查」)問的是
   * 氣候情境分析 —— 兩節都在問**標題以外**的東西。
   *
   * 那是「後段章節很薄」的第三個成因,而票上只列了兩個(來源本來就短 / 切片漏掉):
   * 模型被要求寫一份 ISO 盤查報告裡不存在的內容,於是它只能寫幾十個字。
   * 實測落地字數:ch6 = 40 字、ch7 = 113 字。
   *
   * 判準取標題的關鍵詞,不做語意判斷 —— 這條只擋「明顯問別的題目」。
   */
  it.each([
    { id: "ch6", keyword: "盤查作業" },
    { id: "ch7", keyword: "內部查證" },
  ])("$id 的 guidance 對得上它自己的標題（$keyword）", ({ id, keyword }) => {
    expect(guidanceOf(id)).toContain(keyword);
  });

  // Info: (20260818 - Emily) 負面判準:揭露題目只准出現在揭露章節(見 OFF_TOPIC_SUBJECTS)
  it.each(OFF_TOPIC_SUBJECTS)(
    "「%s」沒有出現在盤查章節裡（它屬於 IFRS S2 揭露章節，不屬於盤查報告的章節）",
    (subject) => {
      const offenders = CARBON_REPORT_OUTLINE.filter(
        (section) =>
          !DISCLOSURE_CHAPTER_IDS.includes(section.chapterId) &&
          (section.guidance ?? "").includes(subject),
      ).map((section) => `${section.id}(${section.code})`);

      expect(offenders).toEqual([]);
    },
  );

  /**
   * Info: (20260818 - Emily) 標準名稱要出現在**模型看得到的地方**。
   *
   * 只有 `ch1-intro` 寫對不夠:模型寫 3.3 的量化方法時,注入的是 3.3 的 guidance,
   * 不是導論的。每一處引用標準的地方都得自己指名。
   */
  it.each(["ch1-intro", "ch1-5", "ch2-3", "ch3-3", "ch11"])(
    "%s 自己就指名 ISO 14064-1（模型只看得到本節的 guidance）",
    (id) => {
      expect(guidanceOf(id)).toContain("ISO 14064-1");
    },
  );
});

/**
 * Info: (20260818 - Emily) 骨架的反向護欄:`44` 只改 guidance。
 *
 * `title` 不只是 UI 文字 —— 它同時是段落切分標題與錨點
 * (`buildSectionHeading`,大綱檔頭有寫)。改了 title 會讓既有草稿對不回自己的段落,
 * 而那是修正端與生效端的混淆:改 guidance 影響的是**接下來**產生的內容,
 * 改 title 會回頭弄壞已經存在的東西。
 *
 * 所以這一組刻意反著寫:它會在有人「順手把 2.3 的標題也改成類別制」時紅。
 * `2.3 排放範疇與類別劃分` 是全檔唯一還留著「範疇」的地方,而它**應該**留著。
 */
describe("骨架未被動到（只改 guidance）", () => {
  it("仍然是 11 章 33 段", () => {
    expect(CARBON_REPORT_CHAPTERS).toHaveLength(11);
    expect(CARBON_REPORT_SECTION_COUNT).toBe(33);
    expect(CARBON_REPORT_OUTLINE).toHaveLength(33);
  });

  it("2.3 的 title 保持原樣（它是切分錨點,不是文案）", () => {
    const section = CARBON_REPORT_OUTLINE.find((item) => item.id === "ch2-3");

    expect(section?.title).toBe("排放範疇與類別劃分");
    expect(section?.code).toBe("2.3");
  });

  it("每一節都掛在存在的章底下", () => {
    const chapterIds = new Set(
      CARBON_REPORT_CHAPTERS.map((chapter) => chapter.id),
    );
    const orphans = CARBON_REPORT_OUTLINE.filter(
      (section) => !chapterIds.has(section.chapterId),
    ).map((section) => section.id);

    expect(orphans).toEqual([]);
  });

  // Info: (20260818 - Emily) guidance 會被直接串進 prompt,前後空白會變成 prompt 裡的空行
  it("每一節的 guidance 都沒有前後空白", () => {
    const untrimmed = CARBON_REPORT_OUTLINE.filter(
      (section) => section.guidance !== section.guidance.trim(),
    ).map((section) => section.id);

    expect(untrimmed).toEqual([]);
  });
});

/**
 * Info: (20260818 - Emily) 同一句宣告在系統裡有三個地方,這一組把三端綁在一起
 * (`data/issue_drafts/open/44_iso_standard_alignment.md`,上線阻擋 B2)。
 *
 * ## 為什麼上面那些測試不夠
 *
 * 上面驗的是 `CARBON_REPORT_OUTLINE` 的 guidance。但 `open/44` 的驗收條件
 * (閘門文件寫的是「guidance 不得出現 IFRS / 範疇一」)**比它要守的東西窄** ——
 * B2 的標題是「報告上宣告錯的標準」,而報告的標準宣告來自三個地方:
 *
 * 1. guidance（每一節的撰寫目標）
 * 2. `paragraph_draft.service.ts` 的角色句 —— 位置在 guidance **之上**,每一次呼叫都注入
 * 3. `i18n/locales/<語系>/solutions.ts` 的 `iso_report_desc` —— 官網對外的產品說明,五個語系
 *
 * 第 2 個原本寫「(IFRS S1/S2 對齊)」:模型會同時收到兩句互相矛盾的指示,而框架句在前。
 * 第 3 個是**字面上的對外承諾**,而閘門文件第五節的決議是「對外先承諾 ISO 14064-1」。
 * 只讓第 1 個轉綠就宣告 B2 完成,是讓判準比它要守的東西窄 ——
 * 這一週被 review 擋下的三條 blocker 全部是這個形狀。
 */
describe("對外宣告的標準（三端一致）", () => {
  const LOCALES = [
    { name: "zh_tw", solutions: solutionsZhTw },
    { name: "zh_cn", solutions: solutionsZhCn },
    { name: "en", solutions: solutionsEn },
    { name: "ja", solutions: solutionsJa },
    { name: "ko", solutions: solutionsKo },
  ];

  it("標準名稱有唯一來源,而 guidance 用的就是它", () => {
    expect(CARBON_REPORT_STANDARD).toBe("ISO 14064-1");
    expect(CARBON_VERIFICATION_STANDARD).toBe("ISO 14064-3");
    expect(guidanceOf("ch1-intro")).toContain(CARBON_REPORT_STANDARD);
    expect(guidanceOf("ch11")).toContain(CARBON_VERIFICATION_STANDARD);
  });

  /**
   * Info: (20260818 - Emily) 官網五個語系的產品說明。鍵名叫 `iso_report_desc`
   * 而內容原本寫「符合 IFRS S1/S2 標準」—— 鍵名與內容自己就打架了。
   * 它印在 `(landing)/solutions` 那兩頁上,是使用者付錢前看到的那句話。
   */
  it.each(LOCALES)(
    "$name 的 iso_report_desc 不提 IFRS,並指名 ISO 14064-1",
    ({ solutions }) => {
      const desc: string = solutions.iso_report_desc;

      expect(desc).not.toMatch(/IFRS/);
      expect(desc).toContain(CARBON_REPORT_STANDARD);
    },
  );

  /**
   * Info: (20260818 - Emily) 草稿服務的角色句只能從原始碼驗。
   *
   * 那個字串在 `buildPrompt`（private）裡面,而 import 整個服務會連帶拉進
   * `chat.service` 與 Gemini SDK —— 為了驗一句話而在單元測試裡初始化 LLM 客戶端不合理。
   *
   * 讀原始碼在單元測試裡不常見,但這一條守的正是「原始碼裡不准再出現那個字串」,
   * 而它是 B2 的第二端。壞掉的時候會紅,不會靜默通過 —— 這比漂亮重要。
   */
  it("草稿服務的角色句不再宣告 IFRS", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/services/paragraph_draft.service.ts"),
      "utf-8",
    );
    /**
     * Info: (20260818 - Emily) 先去掉註解才判。
     *
     * 第一版直接對整份原始碼斷言「不含 IFRS」,結果它被**自己的說明註解**擋下 ——
     * 那句註解正是在解釋「原本寫 IFRS S1/S2,為什麼改掉」。
     * 一條連「記錄這件事為什麼發生」都不允許的護欄,會讓下一個人把註解刪掉來讓測試變綠,
     * 而那正好刪掉了唯一的出處。要守的是**程式碼不准宣告**,不是不准提起。
     */
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");

    expect(code).not.toMatch(/IFRS/);
    /*
     * Info: (20260821 - Emily) 08-21 之後,角色句的標準名稱走框架視圖而不是直接
     * import 常數(單一來源搬進 carbonFrameworkView;直接引用由
     * carbon_framework_view.test.ts 的消費者掃描釘住)。這條斷言跟著搬:
     * 要守的東西沒變 —— 角色句不得硬編任何標準名稱,必須經過單一來源。
     */
    expect(code).toContain("${view.standardLabel}");
  });
});

/**
 * Info: (20260818 - Emily) 機械化的第四端掃描（`data/issue_drafts/open/44_iso_standard_alignment.md`）。
 *
 * ## 為什麼要這一組
 *
 * 這一週有三次清單短了,形狀完全相同:
 *
 * | 次 | 清單說 | 實際 |
 * | --- | --- | --- |
 * | `44` 的 guidance | 8 條 | 16 處 |
 * | `48` 的修法 | 只要輸出表格 | 還得先修排序,否則開一條繞過防幻覺護欄的路 |
 * | B2 的宣告端 | 3 端 | **4 端**(漏掉 ADR `014_real_esg_report_ingestion.md` 第 39 行) |
 *
 * 共同成因不是粗心:**列清單的人與跑判準的人是同一個,而清單沒有被機械化。**
 * 所以這一組不列清單,它掃檔案。
 *
 * ## 判準怎麼定的
 *
 * 「任何**指名這份大綱或這份報告**的檔案,都不得宣告 IFRS。」
 *
 * 在 08-18 動手前的樹上實測,這條規則在 `src/` 與 `documents/` 的 1,927 個檔案裡
 * 命中 **4 個**,而且正好是那四端:
 *
 * ```
 * src/constants/carbon_report_outline.ts
 * src/i18n/locales/zh_tw/solutions.ts
 * src/services/paragraph_draft.service.ts
 * documents/architecture/decisions/014_real_esg_report_ingestion.md   ← 人眼漏掉的那個
 * ```
 *
 * 零誤報。另外 23 個含 IFRS 的檔案（會計側的 persona、T-IFRS、`rule: "IFRS"`、
 * 碳健檢問卷、帳本側的方法論文件）都不指名這份大綱,規則自然放過 ——
 * **不需要維護排除清單,因為判準本身就切得開。**
 *
 * ## 兩條規則互補,不是重複
 *
 * `zh_cn/solutions.ts` 寫的是「碳盘查报告书」（簡體），這條規則抓不到它;
 * 而上面「對外宣告的標準」那一組是逐語系比對 `iso_report_desc`,五個語系都蓋到。
 * 一條掃得廣但會漏字形,一條蓋得準但只看一個鍵。兩條一起才是完整的。
 *
 * ## 先去掉註解才判
 *
 * 與草稿服務那一條同一個理由:守的是**宣告**,不是不准提起。
 * 那四個檔案改完之後仍然都提到 IFRS —— 全部在註解裡解釋「原本寫什麼、為什麼改」,
 * 而那是唯一的出處。一條連記錄歷史都不允許的護欄,會被下一個人用刪註解的方式弄綠。
 */
describe("指名這份大綱或這份報告的檔案,不得宣告 IFRS（機械化掃描）", () => {
  /** Info: (20260818 - Emily) 「指名這份大綱或這份報告」的兩個標記 */
  const NAMES_THIS_REPORT = ["carbon_report_outline", "盤查報告書"];

  /**
   * Info: (20260818 - Emily) 唯一的例外:掃描器自己。
   * 本檔的 `FORBIDDEN_STANDARDS` 裡有 `/IFRS/` 這個 pattern,而那是程式碼不是註解。
   */
  const ALLOWLIST = [
    "src/__tests__/carbon_report_outline.test.ts",
    /**
     * Info: (20260821 - Emily) 框架視圖與它的測試。視圖是**合法的切換點**:
     * 它存在的理由就是同時指名這份大綱與 IFRS 揭露版,依所選框架回傳其中一套
     * (角色句 + guidance + 外殼聲明三欄一體,見該檔檔頭)。
     * 它宣告 IFRS 是有條件的(IFRS_S1_S2 分支),而「宣告要帶條件」正是 08-21
     * 判準改版(全域黑名單 → 依宣告分流)的核心 —— 紙面那端由
     * auditFrameworkClaims 的四條判準守,不靠這個掃描。
     */
    "src/lib/carbon_framework_view.ts",
    "src/__tests__/carbon_framework_view.test.ts",
    /**
     * Info: (20260903 - Emily) 揭露框架**選擇入口**的測試(#6688-A)。
     *
     * 與上面那兩個同一類:它必須同時指名這份報告(它驗的是盤查狀態與
     * 段落草稿請求的 schema)與 IFRS(它驗的是選了 IFRS 之後那個值撐不撐過重載)。
     * 沒有這個入口,`carbon_framework_view` 的 IFRS 分支在真實路徑上零觸發 ——
     * 所以「能不能選到 IFRS」本身要有測試,而那份測試寫不出不含 IFRS 字樣的版本。
     *
     * 界線:被允許的是**測試**,不是產品文案。同一輪把 IFRS 字樣從五個語系檔
     * 移回 `constants/carbon_report_framework.ts`(以插值帶進介面)——
     * 語系檔不是宣告的出處,所以它不該進這張清單。
     */
    "src/__tests__/carbon_disclosure_framework_entry.test.ts",
    /**
     * Info: (20260819 - Emily) IFRS 揭露版的 guidance。裡面的 IFRS 字樣是**內容**,
     * 不是誤植 —— 那份檔案存在的理由就是保存 IFRS S1/S2 那一套指引。
     *
     * 08-19 發現它原本**不會**被這個掃描器抓到:判準是「檔案內容提到
     * carbon_report_outline 或 盤查報告書」,而它只在註解裡提到,註解會被剝掉。
     * 所以把判準補上檔名(見 `namesThisReport`),讓這條例外變成承重的 ——
     * 判準蓋不住它要守的東西時,靜默放過比誤報危險。
     */
    "src/constants/carbon_report_outline_ifrs.ts",
  ];

  const stripComments = (text: string, isMarkdown: boolean): string =>
    isMarkdown
      ? text.replace(/<!--[\s\S]*?-->/g, "")
      : text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  const walk = (dir: string, out: string[]): string[] => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Info: (20260818 - Emily) 建置產物與依賴不掃(掃了會很慢,而且不是我們寫的)
        if (
          ["node_modules", ".next", "dist", "coverage"].includes(entry.name)
        ) {
          continue;
        }
        walk(full, out);
        continue;
      }
      if (/\.(ts|tsx|md)$/.test(entry.name)) out.push(full);
    }
    return out;
  };

  const scan = (): { files: string[]; offenders: string[] } => {
    const roots = ["src", "documents"].filter((dir) =>
      fs.existsSync(path.join(process.cwd(), dir)),
    );
    const files = roots.flatMap((root) =>
      walk(path.join(process.cwd(), root), []),
    );
    const offenders: string[] = [];
    files.forEach((full) => {
      const relative = path.relative(process.cwd(), full);
      if (ALLOWLIST.includes(relative)) return;
      const code = stripComments(
        fs.readFileSync(full, "utf-8"),
        relative.endsWith(".md"),
      );
      const namesThisReport = NAMES_THIS_REPORT.some(
        (name) => code.includes(name) || relative.includes(name),
      );
      if (namesThisReport && code.includes("IFRS")) offenders.push(relative);
    });
    return {
      files: files.map((full) => path.relative(process.cwd(), full)),
      offenders,
    };
  };

  /**
   * Info: (20260818 - Emily) 掃一次就好。兩條測試各掃一次會把 1,900 個檔案讀兩遍,
   * 而它們要的是同一份結果。
   */
  let cached: { files: string[]; offenders: string[] } | undefined;
  const scanOnce = (): { files: string[]; offenders: string[] } => {
    cached = cached ?? scan();
    return cached;
  };

  /**
   * Info: (20260818 - Emily) 先確認掃描器真的走到了東西。
   *
   * 一支走壞的掃描器會回傳 0 個檔案、0 個違例,然後**永遠是綠的** ——
   * 那比沒有這條測試更糟,因為它會讓人以為掃過了。
   * 不用「檔案數 > N」當判準（那個數字會隨 repo 成長而失去意義）,
   * 直接點名三個一定要被走到的路徑。
   */
  it("掃描器真的走到了 src 與 documents（防止空掃描假綠）", () => {
    const { files } = scanOnce();

    expect(files).toContain("src/constants/carbon_report_outline.ts");
    expect(files).toContain("src/services/paragraph_draft.service.ts");
    expect(files.some((file) => file.startsWith("documents/"))).toBe(true);
  });

  it("沒有任何檔案一邊指名這份大綱、一邊宣告 IFRS", () => {
    const { offenders } = scanOnce();

    expect(offenders).toEqual([]);
  });
});

/**
 * Info: (20260819 - Emily) 兩套 guidance 必須節節對得上。
 *
 * 08-19 之後的核心風險:大綱有兩套撰寫指引(ISO 與 IFRS 揭露版),而它們是兩個檔案。
 * 任何一邊新增或刪節,另一邊沒跟上就會在產出時少一節或多一節 ——
 * 而且是**選了那個框架的客戶**才踩得到,平常跑驗收看不出來
 * (現行預設是 ISO 那一套)。所以判準是集合相等,不是「IFRS 版有就好」。
 */
describe("兩套 guidance 的一致性", () => {
  it("IFRS 揭露版的鍵與大綱的節 id 完全相同", () => {
    const outlineIds = CARBON_REPORT_OUTLINE.map(
      (section) => section.id,
    ).sort();
    const ifrsIds = Object.keys(CARBON_REPORT_GUIDANCE_IFRS).sort();

    expect(ifrsIds).toEqual(outlineIds);
  });

  it("IFRS 揭露版沒有空白的指引", () => {
    expect(
      Object.entries(CARBON_REPORT_GUIDANCE_IFRS)
        .filter(([, guidance]) => guidance.trim().length === 0)
        .map(([id]) => id),
    ).toEqual([]);
  });

  /**
   * Info: (20260819 - Emily) 反向判準:IFRS 版**應該**留著 IFRS 字樣。
   * 若有人再拿 08-18 那套「把 IFRS 換成 ISO」的做法掃過這份檔案,這條會紅。
   */
  it("IFRS 揭露版仍保有 IFRS S1/S2 的宣告", () => {
    expect(CARBON_REPORT_GUIDANCE_IFRS["ch1-intro"]).toContain("IFRS S1/S2");
  });

  /**
   * Info: (20260821 - Emily) 兩套 guidance 都不得含**主體合規動詞**(符合/遵循/依循/通過 + IFRS)。
   *
   * 08-21 實際抓到兩段:原稿的 ch1-intro「聲明報告編寫符合 IFRS S1/S2」與
   * ch3-3「載明遵循 IFRS S2 規定」。guidance 是系統 prompt,模型會照著把那些動詞
   * 印上紙 —— 那不是幻覺,是我們自己指示的。而未到金管會適用時程的企業
   * 提前宣告合規是紅線。
   *
   * 用**驗收判準同一份** COMPLIANCE_CLAIM_PATTERNS 掃:源頭與紙面同一把尺,
   * 兩邊各寫一份的話,改了一邊另一邊就靜靜過期。
   * 上一行那條「仍保有 IFRS S1/S2」是反方向的護欄:框架名稱要留著,
   * 合規動詞不能有 —— 兩條一起才說得完整。
   */
  it("兩套 guidance 都不含主體合規宣告的動詞", () => {
    const offenders: string[] = [];
    CARBON_REPORT_OUTLINE.forEach((section) => {
      const squeezedGuidance = squeezeForMatch(section.guidance);
      COMPLIANCE_CLAIM_PATTERNS.forEach((pattern) => {
        if (pattern.test(squeezedGuidance)) {
          offenders.push(`ISO版 ${section.id}: ${String(pattern)}`);
        }
      });
    });
    Object.entries(CARBON_REPORT_GUIDANCE_IFRS).forEach(([id, guidance]) => {
      const squeezedGuidance = squeezeForMatch(guidance);
      COMPLIANCE_CLAIM_PATTERNS.forEach((pattern) => {
        if (pattern.test(squeezedGuidance)) {
          offenders.push(`IFRS版 ${id}: ${String(pattern)}`);
        }
      });
    });

    expect(offenders).toEqual([]);
  });
});
