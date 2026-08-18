/**
 * Info: (20260818 - Emily) 基準線分層判準的不變式（B3 的完成定義）。
 *
 * ## 這一組為什麼存在
 *
 * B3 的完成定義原本寫「`--baseline` 的差異只剩頁數與字元數」，
 * 而照字面執行一定判不過 —— 快照裡有一批鍵本來就隨 LLM 輸出變動
 * （08-17 同一份輸入兩趟：表 17 vs 19、圖節點 17 vs 21、切片 5 vs 7、token 477k vs 406k）。
 *
 * 改成三層之後，判準從「有人看過那份 diff 並覺得可以」變成程式判。
 * 但**分類表本身是手寫的**，而這一週三次清單短了都是同一個形狀：
 * `44` 說 8 條實際 16 處、`48` 的修法漏了排序那個洞、B2 說三端實際四端。
 * 所以這一組不逐鍵核對我寫的清單 —— 它**從驗收腳本的原始碼反推腳本會寫哪些鍵**，
 * 再要求每一個都被分類。腳本是本尊，清單是副本，讓副本對著本尊紅。
 */
import { describe, it, expect } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import {
  BASELINE_THRESHOLD_LIMITS,
  BASELINE_TIERS,
  activityDataLevel,
  classifyKey,
  normalizeUatLog,
  unmeasuredThresholdLevel,
} from "@/constants/carbon_uat_baseline";

const UAT_SCRIPT = path.join(process.cwd(), "scripts/uat_carbon_report.ts");

/**
 * Info: (20260818 - Emily) 從腳本原始碼抽出它會寫進 snapshot 的每一個鍵。
 *
 * 四種寫法都要抓，漏一種就等於默許那一種繞過分類：
 *   snapshot.log_input_tokens = …          → 屬性寫法（識別字可含中文）
 *   snapshot["CMap 來源側落在相容區"] = …    → 帶空白的鍵用中括號
 *   snapshot[`圖表未繪製_${meaning}`] = …    → 動態鍵，取 `${` 之前的字面前綴
 *   expectZero("私有區符號", …)              → 它內部就是 snapshot[name] = …
 */
const snapshotKeysWrittenByScript = (): {
  exact: string[];
  prefixes: string[];
} => {
  const source = fs.readFileSync(UAT_SCRIPT, "utf-8");
  const collect = (pattern: RegExp): string[] =>
    [...source.matchAll(pattern)].map((match) => match[1]);

  const exact = [
    ...collect(/snapshot\.([A-Za-z_$一-鿿][\w$一-鿿]*)\s*=/g),
    ...collect(/snapshot\["([^"]+)"\]\s*=/g),
    ...collect(/expectZero\(\s*"([^"]+)"/g),
  ];
  const prefixes = collect(/snapshot\[`([^`$]*)\$\{/g);
  return {
    exact: [...new Set(exact)].sort(),
    prefixes: [...new Set(prefixes)].sort(),
  };
};

describe("驗收腳本的每一個快照鍵都有分層", () => {
  /**
   * Info: (20260818 - Emily) 先確認抽取器真的抽到東西。
   * 一支抽不到鍵的抽取器會回傳空陣列、然後下面每一條都綠 ——
   * 那比沒有這組測試更糟。點名兩個一定存在的鍵，一個屬性寫法、一個中括號寫法。
   */
  it("抽取器真的從腳本抽到鍵（防止空抽取假綠）", () => {
    const { exact, prefixes } = snapshotKeysWrittenByScript();

    expect(exact).toContain("log_input_tokens");
    expect(exact).toContain("CMap 來源側落在相容區");
    expect(exact).toContain("私有區符號");
    expect(prefixes).toContain("圖表未繪製_");
    expect(exact.length).toBeGreaterThan(25);
  });

  it("腳本寫的每一個鍵都被分類（清單短了就會紅）", () => {
    const { exact, prefixes } = snapshotKeysWrittenByScript();

    const unclassified = [...exact, ...prefixes].filter(
      (key) => classifyKey(key) === undefined,
    );
    expect(unclassified).toEqual([]);
  });

  /**
   * Info: (20260818 - Emily) 反向：分類表不得列出腳本根本不會寫的鍵。
   *
   * 拼錯一個鍵名的後果是**靜默的**：那個鍵永遠不會出現在快照裡，
   * 於是它看起來被分類了，而真正的那個鍵落進「沒人在判」的縫。
   * 前綴規則不受這條約束（它們刻意比實際鍵短）。
   */
  it("分類表沒有列出腳本不會寫的鍵（防止拼錯後靜默失效）", () => {
    const { exact, prefixes } = snapshotKeysWrittenByScript();
    const written = new Set(exact);

    const ghosts = BASELINE_TIERS.flatMap((rule) => rule.keys ?? []).filter(
      (key) =>
        !written.has(key) && !prefixes.some((prefix) => key.startsWith(prefix)),
    );
    expect(ghosts).toEqual([]);
  });
});

describe("分層本身的一致性", () => {
  it("同一個鍵不得同時屬於兩層", () => {
    const seen = new Map<string, string>();
    const duplicated: string[] = [];
    BASELINE_TIERS.forEach((rule) => {
      (rule.keys ?? []).forEach((key) => {
        if (seen.has(key))
          duplicated.push(`${key}(${seen.get(key)} / ${rule.tier})`);
        seen.set(key, rule.tier);
      });
    });

    expect(duplicated).toEqual([]);
  });

  /**
   * Info: (20260818 - Emily) 這四個是三層分類成立的理由，寫成測試而不是註解。
   *
   * **數量會變，一致性不會。** `引用的表號` 17 vs 19 可以變，
   * `引用但不存在的表` 不可以；`圖表退化成表格` 1 vs 2 可以變，
   * `圖表未繪製_節點太多且整張消失` 必須兩趟都 0。
   * `open/48` 把「超過上限」的後果變成決定性的 —— 那就用後果當判準，不要用次數。
   */
  it.each([
    { key: "引用但不存在的表", tier: "must_match" },
    { key: "引用的表號", tier: "record_only" },
    { key: "圖表未繪製_節點太多且整張消失", tier: "must_match" },
    { key: "圖表退化成表格", tier: "record_only" },
  ])("$key 屬於 $tier", ({ key, tier }) => {
    expect(classifyKey(key)).toBe(tier);
  });

  /**
   * Info: (20260818 - Emily) `圖表未繪製_` 這個前綴落在 record_only，
   * 而 `圖表未繪製_節點太多且整張消失` 這個**完整鍵**落在 must_match。
   * 順序決定結果 —— must_match 的精確鍵必須先被找到，否則前綴會把它吃掉。
   * 這條釘住那個順序：它是唯一一個「前綴與精確鍵衝突」的地方。
   */
  it("must_match 的精確鍵優先於 record_only 的前綴", () => {
    expect(classifyKey("圖表未繪製_節點太多且整張消失")).toBe("must_match");
    expect(classifyKey("圖表未繪製_素材不足")).toBe("record_only");
  });

  /**
   * Info: (20260818 - Emily) 門檻是可執行的數字,不是文件裡的敘述。
   *
   * `open/42` 的預測表寫「樂觀 ≈165k／保守 ≈250k」。fail 線一定要在 **250k**:
   * 畫在 200k 的話,一趟跑到 230k 會被判 fail —— 而 230k 在票自己的預測裡是正常的。
   * 這一條就是釘住「fail 線不得縮進票允許的區間裡」。
   */
  it("token 的 fail 線在票允許的區間之外(250k),不是區間中間(200k)", () => {
    const tokens = BASELINE_THRESHOLD_LIMITS.find(
      (limit) => limit.key === "log_input_tokens",
    );

    expect(tokens?.passAtOrBelow).toBe(200_000);
    expect(tokens?.failAbove).toBe(250_000);
    // Info: (20260818 - Emily) 保守預測 250k 必須落在「不 fail」那一側
    expect(tokens ? 250_000 <= tokens.failAbove : false).toBe(true);
  });

  /**
   * Info: (20260818 - Emily) 切片沒有 warn 帶:`42` 實測 9 次浪費裡 2 次是完全沒索引,
   * 而那只有 Fix 2(已延後)處理得掉。Fix 1-only 的一趟**必然**剩 2 ——
   * 2 是推導出來的期望值,不是折衷,所以 pass 線與 fail 線同一個數字。
   */
  it("切片沒切的 pass 線與 fail 線都是 2(沒有 warn 帶)", () => {
    const slices = BASELINE_THRESHOLD_LIMITS.find(
      (limit) => limit.key === "log_切片_根本沒切",
    );

    expect(slices?.passAtOrBelow).toBe(2);
    expect(slices?.failAbove).toBe(2);
  });

  it("每個門檻的鍵都落在 threshold 層(否則會被要求兩趟相同)", () => {
    BASELINE_THRESHOLD_LIMITS.forEach((limit) => {
      expect(classifyKey(limit.key)).toBe("threshold");
      // Info: (20260818 - Emily) failAbove 不得小於 passAtOrBelow,否則 warn 帶是負的
      expect(limit.failAbove).toBeGreaterThanOrEqual(limit.passAtOrBelow);
    });
  });
});

/**
 * Info: (20260818 - Emily) 量不到閾值時的層級（B4 的閘門不得被綠燈蓋住）。
 *
 * 08-18 實跑兩份報告的結果是「20 通過 / 0 失敗 / 2 警告」、exit 0 ——
 * **而 B4 的兩個門檻根本沒判**,因為那一趟沒帶 `--log`。
 * 掛到 CI 上就是綠燈,而兩個閘門項目沒有被檢查。
 *
 * 那是這一週同一個形狀的又一次,只是方向相反:前幾次判準比要守的東西**窄**（會漏報）,
 * 這次比要守的東西**寬**（會誤放）。兩種都讓判準失去意義。
 */
describe("量不到 B4 閾值時的層級", () => {
  /**
   * Info: (20260818 - Emily) 判準是「有 `--baseline` 就是驗收趟」。
   * 不另外加旗標:拿基準線來比,正好是「我在做驗收」最可靠的訊號 ——
   * 探索性地看一份 PDF 不會比基準線,而 B3 的定義本身就是兩趟比對。
   */
  it.each([
    { hasBaseline: true, hasLog: false, expected: "fail" },
    { hasBaseline: true, hasLog: true, expected: "fail" },
    { hasBaseline: false, hasLog: false, expected: "warn" },
    { hasBaseline: false, hasLog: true, expected: "warn" },
  ])(
    "baseline=$hasBaseline log=$hasLog → $expected",
    ({ hasBaseline, hasLog, expected }) => {
      expect(unmeasuredThresholdLevel({ hasBaseline, hasLog })).toBe(expected);
    },
  );

  /**
   * Info: (20260818 - Emily) `hasLog` 刻意不影響層級。
   *
   * 帶了 `--log` 但 log 裡沒有那些鍵（截斷、或那一趟根本沒觸發匯入),結果一樣是**沒判**。
   * 門檻的意義是「量到而且過關」,量不到不能算過 —— 那個參數只用來決定訊息怎麼寫。
   * 這一條釘住那個決定:哪天有人讓「帶了 log 就算過」,它會紅。
   */
  it("帶了 log 但鍵缺席,在驗收趟仍然是 fail", () => {
    expect(unmeasuredThresholdLevel({ hasBaseline: true, hasLog: true })).toBe(
      "fail",
    );
    expect(
      unmeasuredThresholdLevel({ hasBaseline: true, hasLog: false }),
    ).toEqual(unmeasuredThresholdLevel({ hasBaseline: true, hasLog: true }));
  });
});

/**
 * Info: (20260818 - Emily) 每一條「丟掉資料」的 log,驗收腳本都必須讀得到。
 *
 * ## 為什麼有這一組
 *
 * 08-18 發現 `report_import.service.ts` 有**兩條**丟表的 log,而驗收腳本只解析一條:
 *
 * | 行 | 訊息 | 有 tableNo | 腳本原本 |
 * | --- | --- | --- | --- |
 * | 1057 | `source table dropped`（單數） | ✅ | 讀得到 |
 * | 1128 | `source tables dropped`（複數,數量上限） | ❌ | **讀不到** |
 *
 * 於是複數那條一旦觸發,一整段的表會消失,而腳本回報「log:原文表格被丟 0 張」。
 * **一個永遠不會紅的 fail 級判準,比沒有那個判準更糟** —— 它會讓人以為查過了。
 *
 * ## 為什麼不是列一張清單
 *
 * 列清單就是這一週失效四次的那個做法（`44` 說 8 條、`48` 漏了排序、B2 說三端、
 * 這次丟表說一條）。所以這一組**從服務的原始碼抽出所有「dropped」的 log 訊息**,
 * 再要求每一條都出現在驗收腳本裡。日後有人新增第三條丟表的 log,這裡會紅。
 *
 * 它驗的是「腳本有沒有在看」,不是「正規表示式寫對了」—— 後者只有真的丟表的那一趟能證明。
 * 但「有沒有在看」正是這次漏掉的那一層。
 */
describe("服務端每一條丟資料的 log,驗收腳本都在看", () => {
  const IMPORT_SERVICE = path.join(
    process.cwd(),
    "src/services/report_import.service.ts",
  );

  it("report_import.service 的每一條 dropped log 都被驗收腳本解析", () => {
    const service = fs.readFileSync(IMPORT_SERVICE, "utf-8");
    const uat = fs.readFileSync(UAT_SCRIPT, "utf-8");

    /**
     * Info: (20260818 - Emily) 抓 `logger.warn("…dropped…"` 的訊息字串。
     * 只看 `dropped` 這一類:它們的共同語意是「原文有、產出沒有」,
     * 而那正是這支驗收腳本存在的理由(紙上看不出來的靜默失敗)。
     */
    const messages = [
      ...service.matchAll(
        /logger\.(?:warn|error|info)\(\s*"([^"]*dropped[^"]*)"/g,
      ),
    ].map((match) => match[1]);

    // Info: (20260818 - Emily) 抽取器自己要先抓到東西,否則這條測試會空過
    expect(messages.length).toBeGreaterThanOrEqual(2);

    const unwatched = messages.filter((message) => {
      // Info: (20260818 - Emily) 腳本比對的是去掉 [ReportImportService] 前綴的訊息本體
      const core = message.replace(/^\[[^\]]+\]\s*/, "");
      return !uat.includes(core);
    });
    expect(unwatched).toEqual([]);
  });
});

/**
 * Info: (20260818 - Emily) log 格式正規化（會靜默說謊的那個陷阱)。
 *
 * `--log` 指到 Next.js 16 的 `.next/dev/logs/next-development.log` 時,
 * 帶引號的判準一條都不會中 —— 而後果不是報錯,是 `log_丟表 = []` 然後回報 ✓。
 * 實測那份 log 上 `"inputTokens":`、`"fellBack":true`、`"tableNo":` 全部 0 次。
 */
describe("log 格式正規化", () => {
  /** Info: (20260818 - Emily) 取自 08-18 那份 Next dev log 的真實一行(縮短) */
  const NEXT_JSON_LINE = JSON.stringify({
    timestamp: "00:11:09.666",
    source: "Server",
    level: "INFO",
    message:
      '[INFO] [ReportImportService] source table dropped (service=X) {"tableNo":"表2.1","reason":"not_a_table"}',
  });

  it("JSON-lines 取出 message,轉義的引號還原成判準讀得到的樣子", () => {
    const out = normalizeUatLog(NEXT_JSON_LINE);

    expect(out).toContain('"tableNo":"表2.1"');
    expect(out).not.toContain("timestamp");
    // Info: (20260818 - Emily) 這正是原本讀不到的原因:轉義後的 \" 不符合判準的 "
    expect(NEXT_JSON_LINE).not.toContain('"tableNo":"表2.1"');
  });

  it("終端格式原樣通過(不能把本來讀得到的弄壞)", () => {
    const plain =
      '[INFO] [ReportImportService] source table dropped {"tableNo":"表3.8"}';

    expect(normalizeUatLog(plain)).toBe(plain);
  });

  it("壞掉的 JSON 與沒有 message 欄位的 JSON 都原樣保留(不猜、不丟)", () => {
    expect(normalizeUatLog('{"broken":')).toBe('{"broken":');
    expect(normalizeUatLog('{"level":"INFO"}')).toBe('{"level":"INFO"}');
  });

  it("多行混合格式逐行處理,行數不變", () => {
    const mixed = [NEXT_JSON_LINE, "plain line", '{"nope":1}'].join("\n");
    const out = normalizeUatLog(mixed);

    expect(out.split("\n")).toHaveLength(3);
    expect(out.split("\n")[1]).toBe("plain line");
  });
});

/**
 * Info: (20260818 - Emily) 活動數據 0 筆的三種成因,層級不同。
 *
 * B1 於 08-17 從閘門移除,而這支腳本原本仍記 fail —— 08-18 兩趟因此各出現一個 ✗、exit 1。
 * **判準留在原地而它要守的東西搬走了**,而一支會為已撤銷判準而紅的驗收腳本,
 * 下一次真的紅的時候沒有人會相信它。
 *
 * 但只降「模型有回鍵但空」那一種:另外兩種是管線斷了,不是來源沒有。
 */
describe("活動數據 0 筆的層級", () => {
  it("有採用到筆數就是 pass", () => {
    expect(activityDataLevel({ asked: 2, hasKey: 2, accepted: 5 })).toBe(
      "pass",
    );
  });

  /**
   * Info: (20260818 - Emily) 08-18 兩趟的實際數字:14 次呼叫、2 次帶 withActivities、
   * 其中 1 次 hasKey:true 而 rawSample 是 "[]"。這是「來源沒有數量」那一種。
   */
  it("模型有回鍵但內容空 → warn（08-17 決議:來源沒有數量）", () => {
    expect(activityDataLevel({ asked: 2, hasKey: 1, accepted: 0 })).toBe(
      "warn",
    );
  });

  /**
   * Info: (20260818 - Emily) 這兩條是降級之後的退化防線。
   * 哪天它從「回了空陣列」掉成「根本不回這個鍵」或「旗標沒送」,
   * 層級會自己變回 fail —— 不需要另外加判準去守它。
   */
  it("沒有任何呼叫帶 withActivities → fail（前端旗標,管線斷了）", () => {
    expect(activityDataLevel({ asked: 0, hasKey: 0, accepted: 0 })).toBe(
      "fail",
    );
  });

  it("有要求但模型從不回這個鍵 → fail（prompt / required 壞了）", () => {
    expect(activityDataLevel({ asked: 2, hasKey: 0, accepted: 0 })).toBe(
      "fail",
    );
  });
});
