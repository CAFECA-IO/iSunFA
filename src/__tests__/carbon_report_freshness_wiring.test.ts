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

describe("寫入段落時打指紋(用請求時的快照、打在敘述上;#6789 review 中-1 / 阻-1)", () => {
  const applyBody = () => {
    const start = hook.indexOf("const applyDraftToReport");
    const end = hook.indexOf("const lastLedgerStampRef");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    return hook.slice(start, end);
  };

  it("applyDraftToReport 從 options.factSnapshot 蓋指紋,而且寫進段落", () => {
    const body = applyBody();
    expect(body).toMatch(
      /fingerprintFromSnapshot\(\s*narrative,\s*options\?\.factSnapshot,?\s*\)/,
    );
    expect(body).toMatch(/ledgerFingerprint,/);
  });

  it("指紋不再拿落地當下的帳本或事實包(那會產生假 FRESH)", () => {
    /**
     * Info: (20260909 - Emily) review 中-1:`/draft` 送出到回來之間帳本可能已變;
     * 落地時拿 `ledgerNow` / 當下事實包蓋,會把一節引用舊數字的段落永久標成最新。
     * 這一條釘住 applyDraftToReport 裡**沒有**用當下帳本組指紋 —— 表格注入照舊用 ledgerNow。
     */
    const body = applyBody();
    expect(body).not.toMatch(/buildParagraphFingerprint\(/);
    expect(body).not.toMatch(/buildChannelLedgerFacts\(/);
    expect(body).not.toMatch(/ledgerComputedAt:\s*ledgerNow/);
  });

  it("指紋打在敘述(narrative)上,不打在注入表格之後的 content(review 阻-1 的另一半)", () => {
    /**
     * Info: (20260909 - Emily) 表格與桑基圖由 `lastLedgerStampRef` 那個 effect 在每次重算時決定性重注入,
     * 永遠是最新的、不存在過期;把它們的數字算進指紋,任何一次重算都會讓每個數據段落 STALE。
     * 會過期的只有 AI 寫的敘述。9/08 那一版寫反了(「用最終 content」),這條釘住改正後的方向。
     */
    const body = applyBody();
    expect(body).toMatch(/const narrative = section\.isDataDriven/);
    expect(body).not.toMatch(/fingerprintFromSnapshot\(\s*content,/);
    expect(body).not.toMatch(/fingerprintFromSnapshot\(\s*draft\.content/);
  });

  it("三條會生成文字的路都在送出前拍快照,並在落地時交給 applyDraftToReport / 套用修訂", () => {
    const gen = hook.slice(hook.indexOf("const generateParagraphDraft"));
    const snapAt = gen.indexOf(
      "const factSnapshot = snapshotChannelFacts(chatChannel);",
    );
    const requestAt = gen.indexOf("const requestDraft = ()");
    expect(snapAt).toBeGreaterThan(-1);
    expect(snapAt).toBeLessThan(requestAt);
    expect(gen).toContain("applyDraftToReport(draft, { factSnapshot });");
    expect(hook).toMatch(
      /chatFactSnapshotRef\.current\.set\(\s*chatChannel,\s*snapshotChannelFacts\(chatChannel\),?\s*\)/,
    );
    expect(hook).toContain("chatFactSnapshotRef.current.get(chatChannel)");
    expect(hook).toContain("factSnapshot: revisionSnapshot,");
    expect(hook).toContain("fingerprintFromSnapshot(revised, factSnapshot)");
  });

  it("快照與 LLM 事實包出自同一個組包點", () => {
    const snap = hook.slice(
      hook.indexOf("const snapshotChannelFacts = useCallback("),
    );
    expect(snap.slice(0, 600)).toContain("buildChannelLedgerFacts(channel)");
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
