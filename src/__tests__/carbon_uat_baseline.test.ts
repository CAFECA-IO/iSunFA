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
  classifyKey,
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
