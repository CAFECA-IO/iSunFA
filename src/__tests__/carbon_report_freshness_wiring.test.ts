import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";

/**
 * Info: (20260908 - Emily) 過期標記的接線(#6786 後半)。
 *
 * 裁決本身是純函式,由 `carbon_report_freshness.test.ts` 守(22 條)。
 * 這一支守的是**接線**:指紋有沒有在寫入段落時打上、打的是哪一份內容、
 * 工具列與目錄有沒有拿到同一份盤點、五語系文案有沒有齊。
 *
 * ## 為什麼是源碼掃描
 *
 * 本專案 jest 的 `testEnvironment` 是 node、沒有 jsdom,渲染不了元件
 * (同 `carbon_chat_markdown.test.ts` / `salary_delivery_ui_contract.test.ts` 的處置)。
 */
const read = (relativePath: string): string =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf-8");

/**
 * Info: (20260908 - Emily) 掃描前先剝註解 —— 這幾支的註解**寫了**它們刻意不做的事
 * (「不另加一顆按鈕」、「不自動重寫」),否定型斷言若連註解一起看會被那些字串命中。
 *
 * JSX 註解那條的否定預查不能寫成惰性量詞 `[\s\S]*?`。
 * 惰性量詞會回溯到**更後面**的區塊註解結束符,只要那個結束符後面跟著 `}` 就成立 ——
 * 於是 `const {` 直接接一段 jsdoc 的地方(`page.tsx` 的 hook 解構就是),
 * 會從那個 `{` 一路吞到 200 行之後的某個 JSX 註解結尾,把中間的程式碼整段吃掉。
 * 9/08 實測那一口吞掉 6197 個字元(第 152–364 行),於是「解構有沒有拿到這個值」
 * 的斷言看不到解構清單。**掃描器自己也要有測試**(見下方第一組)。
 */
const stripComments = (source: string): string =>
  source
    .replace(/\{\s*\/\*(?:(?!\*\/)[\s\S])*\*\/\s*\}/g, "")
    .replace(/\/\*(?:(?!\*\/)[\s\S])*\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const hook = stripComments(read("src/hooks/use_carbon_chat.ts"));
const toolbar = stripComments(
  read("src/components/carbon_chatbot/report_toolbar.tsx"),
);
const outlineTree = stripComments(
  read("src/components/carbon_chatbot/outline_tree.tsx"),
);
const preview = stripComments(
  read("src/components/carbon_chatbot/carbon_report_preview.tsx"),
);
const page = stripComments(read("src/app/user/carbon_chatbot/page.tsx"));

/**
 * Info: (20260908 - Emily) 掃描器自己的測試(#6677 的教訓:驗收腳本自己沒有測試,
 * 而它已經指錯過一次)。這一組守的是「剝註解不會順手剝掉程式碼」——
 * 剝多了的症狀是**假綠**:斷言看不到那段程式碼,但看不到與不存在在 `toMatch` 眼裡一樣。
 */
describe("剝註解不得吞掉程式碼", () => {
  it("`{` 後面直接接 jsdoc 時,不會一路吞到後面的 JSX 註解", () => {
    const source = [
      "const {",
      "  /**",
      "   * Info: 說明",
      "   */",
      "  keepThisIdentifier,",
      "} = useSomething();",
      "return <div>{/* 另一段註解 */}</div>;",
    ].join("\n");
    expect(stripComments(source)).toContain("keepThisIdentifier");
  });

  it("行內註解與區塊註解照剝", () => {
    expect(stripComments("// 註解\nconst a = 1;")).not.toContain("註解");
    expect(stripComments("/* 註解 */const b = 2;")).not.toContain("註解");
    expect(stripComments("{/* JSX 註解 */}\nconst c = 3;")).not.toContain(
      "JSX",
    );
  });
});

describe("寫入段落時打指紋", () => {
  it("applyDraftToReport 打指紋,而且寫進段落", () => {
    const start = hook.indexOf("const applyDraftToReport");
    const end = hook.indexOf("const lastLedgerStampRef");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const body = hook.slice(start, end);
    expect(body).toMatch(/buildParagraphFingerprint\(\{/);
    expect(body).toMatch(/ledgerFingerprint,/);
  });

  it("指紋用最終的 content,不是 draft.content", () => {
    /**
     * Info: (20260908 - Emily) 最終 content 是表格、桑基圖、證據鏈都注入之後的版本,
     * 而注入的表格裡就是帳本的數字。用 `draft.content` 會少認一批依賴,
     * 於是**數據段落**改了帳本也不會被標過期 —— 而數據段落正是最需要標的那些。
     */
    const start = hook.indexOf("const ledgerFingerprint =");
    const body = hook.slice(start, start + 300);
    expect(body).toMatch(/content,/);
    expect(body).not.toMatch(/draft\.content/);
  });

  it("指紋用同一個組包點的事實包(不自己組第二份事實)", () => {
    /**
     * Info: (20260908 - Emily) `buildChannelLedgerFacts` 是事實包**唯一**的組包點(#6745)。
     * 指紋若自己組,「AI 能引用什麼」與「指紋比對什麼」就會分岔,
     * 而分岔的症狀是「AI 引用了一個數字,那個數字變了卻沒有標過期」。
     */
    const start = hook.indexOf("const ledgerFingerprint =");
    const body = hook.slice(start, start + 300);
    expect(body).toMatch(/buildChannelLedgerFacts\(chatChannel\)/);
  });

  it("reportFreshness 也走同一個組包點", () => {
    const start = hook.indexOf("const reportFreshness");
    const body = hook.slice(start, start + 600);
    expect(body).toMatch(/summarizeReportFreshness\(\{/);
    expect(body).toMatch(/buildChannelLedgerFacts\(chatChannel\)/);
    expect(body).toMatch(/computedLedger\?\.computedAt/);
  });

  it("hook 對外回傳 reportFreshness", () => {
    expect(hook).toMatch(/^\s{4}reportFreshness,$/m);
  });
});

describe("工具列的過期節數", () => {
  it("0 節時整塊不出現(常駐一塊「0 節待更新」只是佔掉那一列)", () => {
    expect(toolbar).toMatch(/\{staleCount > 0 && \(/);
  });

  it("節號進 tooltip,不必開抽屜也看得到是哪幾節", () => {
    expect(toolbar).toMatch(/freshness_stale_list/);
    expect(toolbar).toMatch(/staleCodes\.join/);
  });

  it("點擊開目錄 —— 逐節的標記在那裡", () => {
    const start = toolbar.indexOf("{staleCount > 0 && (");
    const body = toolbar.slice(start, start + 700);
    expect(body).toMatch(/onClick=\{onToggleDrawer\}/);
  });
});

describe("目錄的逐節標記與一鍵更新", () => {
  it("過期節有標記", () => {
    expect(outlineTree).toMatch(/staleIds\.has\(p\.id\) && \(/);
    expect(outlineTree).toMatch(/freshness_stale_short/);
  });

  it("一鍵更新走既有的 onGenerateDraft,不另加第二顆按鈕", () => {
    /**
     * Info: (20260908 - Emily) 兩顆長得一樣、做同一件事的按鈕只會讓人猜哪一顆是「更新」。
     * 過期時換的是提示文案與顏色,呼叫的還是同一條 `/draft` 路。
     * 這一條釘住「只有一處呼叫 onGenerateDraft」。
     */
    expect(outlineTree.match(/onGenerateDraft\(p\.id\)/g)).toHaveLength(1);
    expect(outlineTree).toMatch(/freshness_update_section/);
  });

  it("不自動重寫 —— 元件裡沒有任何 effect 會自己呼叫生成", () => {
    expect(outlineTree).not.toMatch(/useEffect/);
  });
});

describe("透傳", () => {
  it("preview 把同一份盤點分別給工具列與目錄", () => {
    expect(preview).toMatch(/staleCount=\{freshness\?\.staleCount\}/);
    expect(preview).toMatch(/staleCodes=\{freshness\?\.staleCodes\}/);
    expect(preview).toMatch(
      /staleParagraphIds=\{freshness\?\.staleParagraphIds\}/,
    );
  });

  it("page 把 hook 的 reportFreshness 接給 preview", () => {
    expect(page).toMatch(/reportFreshness,/);
    expect(page).toMatch(/freshness=\{reportFreshness\}/);
  });
});

describe("五語系文案齊備", () => {
  const KEYS = [
    "freshness_stale_short",
    "freshness_stale_hint",
    "freshness_stale_count",
    "freshness_stale_list",
    "freshness_update_section",
  ];
  const LOCALES = ["zh_tw", "zh_cn", "en", "ja", "ko"];

  LOCALES.forEach((locale) => {
    it(`${locale} 五個鍵都有`, () => {
      const source = read(`src/i18n/locales/${locale}/carbon_chatbot.ts`);
      KEYS.forEach((key) => expect(source).toContain(`${key}:`));
    });
  });

  it("帶插值的兩個鍵在每個語系都保留插值變數", () => {
    /**
     * Info: (20260908 - Emily) 翻譯掉了 `{{count}}` 的話,畫面上會是一塊沒有數字的膠囊 ——
     * 而「有幾節」正是那塊膠囊唯一的資訊。
     */
    LOCALES.forEach((locale) => {
      const source = read(`src/i18n/locales/${locale}/carbon_chatbot.ts`);
      const count = source.slice(source.indexOf("freshness_stale_count:"));
      expect(count.slice(0, 200)).toContain("{{count}}");
      const list = source.slice(source.indexOf("freshness_stale_list:"));
      expect(list.slice(0, 300)).toContain("{{codes}}");
    });
  });
});
