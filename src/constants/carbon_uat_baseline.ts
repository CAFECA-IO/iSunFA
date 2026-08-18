// Info: (20260818 - Emily) 碳報告驗收(`npm run uat:carbon`)的基準線分層判準
// Info: (20260818 - Emily) 抽出成常數的理由:分類表若只存在於腳本裡就沒有測試看得到它,
// Info: (20260818 - Emily) 而這一週三次「清單短了」的成因正是清單沒有被機械化。
// Info: (20260818 - Emily) 判準要在程式的輸入空間裡,不要在論證裡 —— 那就得有人能 import 它。

/**
 * Info: (20260818 - Emily) 基準線比對的三層分類（B3 的完成定義）。
 *
 * ## 為什麼不是「差異只剩頁數與字元數」
 *
 * 閘門文件原本這樣寫,而照字面執行**一定判不過**:快照裡有一批鍵本來就會隨 LLM 輸出變動。
 * 08-17 同一份輸入兩趟量到的是 `引用的表號` 17 vs 19、圖節點 17 vs 21、
 * 切片 5 次 vs 7 次、token 477k vs 406k。
 *
 * 而「允許變動」如果沒有寫下界限,會在星期三下午退化成「任何差異都接受」——
 * 那時 B3 就不是閘門了,而且那個決定會發生在**看到數字之後**。
 * 判準要在輸入空間裡,不要在論證裡。所以分類寫在這裡,由程式判,不靠人記。
 *
 * ## 三層
 *
 * | 層 | 意思 | 判法 |
 * | --- | --- | --- |
 * | `must_match` | 它非零(或不齊)就是缺陷 | 兩趟必須完全相同 |
 * | `threshold`  | 成本判準,本來就是「小於」而不是「等於」 | **每一趟各自**過閾值 |
 * | `record_only`| 數量會變,而變動本身不是缺陷 | 印出來,不判 |
 *
 * ## `must_match` 只比「兩趟相等」,夠不夠
 *
 * 不夠 —— 單看這一層的話,兩趟都丟掉同樣 4 張表會通過:值相等,而報告是壞的。
 *
 * 它成立是**組合**出來的,不是這一層自己保證的:
 * 這些鍵在**單趟**就各自有 fail 級判定(`expectZero`、「內文引用的表都存在」、
 * 「大綱節數 33/33」…),那些判定在 `main()` 裡無條件跑 ——
 * `--baseline` 只在 `compareBaseline()` 裡被讀一次,不會讓任何單趟判定被跳過。
 * 所以壞的那一趟自己就 exit 1,而這一層只需要再加「兩趟一致」。
 *
 * **兩道缺一不可**:少了單趟判定,相等就守不住零;少了相等,非決定性就抓不到。
 * 下一個人若想把單趟判定改成「只在沒有 --baseline 時跑」,這段就是為什麼不行。
 *
 * ## 這個切法成立的理由是一句話:**數量會變,一致性不會。**
 * `引用的表號` 17 vs 19 可以變,`引用但不存在的表` 不可以;
 * `圖表退化成表格` 1 vs 2 可以變,`圖表未繪製_節點太多且整張消失` 必須兩趟都 0。
 * `open/48` 把「超過上限」的**後果**變成決定性的 —— 那就用後果當判準,不要用次數。
 */
export type BaselineTier = "must_match" | "threshold" | "record_only";

export const BASELINE_TIERS: ReadonlyArray<{
  readonly tier: BaselineTier;
  readonly keys?: readonly string[];
  readonly prefixes?: readonly string[];
  readonly why: string;
}> = [
  {
    tier: "must_match",
    keys: [
      // Info: (20260818 - Emily) 一致性:數量可以變,但「內文引用了不存在的表」永遠是 0
      "引用但不存在的表",
      "丟表且紙上也沒有",
      "log_丟表",
      // Info: (20260818 - Emily) 完整性:33 節與目錄不是統計量,是齊或不齊
      "大綱節數",
      "未出現的節",
      "目錄對不上的條目",
      "log_tocMissing",
      // Info: (20260818 - Emily) 碼位:紙上看不出來的靜默失敗,任何一個都不行
      "私有區符號",
      "相容區部首",
      "相容區部首字種",
      "CMap 非法區間(lo>hi)",
      "CMap 目標側落在相容區",
      "CMap 來源側落在相容區",
      // Info: (20260818 - Emily) 轉換外洩:出現就代表某一層沒吃掉它
      "反斜線逸出外洩",
      "mermaid 語法外洩",
      "待補佔位符",
      "資料不足佔位符",
      // Info: (20260818 - Emily) open/48 的驗收:退化的次數可以變,整張消失不可以
      "圖表未繪製_節點太多且整張消失",
    ],
    why: "非零(或不齊)就是缺陷 —— 兩趟必須完全相同",
  },
  {
    tier: "threshold",
    keys: ["log_input_tokens", "log_切片_根本沒切"],
    why: "B4 的成本判準本來就是閾值,每一趟各自過關即可",
  },
  {
    tier: "record_only",
    keys: [
      "pages",
      "chars",
      "引用的表號",
      "有標題的表",
      "目錄條目",
      "大綱命中數",
      "圖表退化成表格",
      "log_chartsRendered",
      "log_chartsFailed",
      "log_圖表被拒",
      "log_llm_呼叫次數",
      "log_切片_切成功",
      "log_切片_切了但退回",
      "log_索引缺的節",
      "log_接回折斷列",
      "log_補分隔列",
      "log_補欄",
      "log_tounicode_decision",
      "log_tounicode_replaced",
      "CMap串流數",
      "CMap條目數",
      "CMap來源側最大碼",
      // Info: (20260818 - Emily) B1 已於 08-17 從閘門移除,這幾個先只記錄
      "log_活動數據_received",
      "log_活動數據_accepted",
      "log_活動數據_呼叫次數",
      "log_活動數據_有要求的呼叫",
      "log_活動數據_模型有回這個鍵",
    ],
    prefixes: [
      /**
       * Info: (20260818 - Emily) `圖表未繪製_素材不足` 與
       * `圖表未繪製_無法回溯原文(疑似模型編造)` 是 `warn` 級,且是**次數**——
       * 同一節這一趟抽到 2 個節點、下一趟 4 個,兩者都正確。
       * 把它們列進 must_match 會讓 B3 因為一個非缺陷的差異而判不過,
       * 那正是這個三層分類要避免的事。所以只有「節點太多且整張消失」那一種進 must_match,
       * 它是上面那條「用後果當判準」的唯一一個 fail 級後果。
       */
      "圖表未繪製_",
      /**
       * Info: (20260818 - Emily) `黏在一行_*` 是 `open/47` 第三種形狀的偵測。
       * 它有自己的驗收條件(連續兩趟零 `not_a_table`),不由 B3 的相等判準管 ——
       * 而且 `47` 若延到 post-launch,把它列進 must_match 會讓 B3 永遠過不了。
       */
      "黏在一行_",
    ],
    why: "數量會變,而變動本身不是缺陷",
  },
];

export const classifyKey = (key: string): BaselineTier | undefined =>
  BASELINE_TIERS.find(
    (rule) =>
      (rule.keys ?? []).includes(key) ||
      (rule.prefixes ?? []).some((prefix) => key.startsWith(prefix)),
  )?.tier;

/**
 * Info: (20260818 - Emily) B4 的閾值。**三段而不是兩段。**
 *
 * ## 為什麼 token 的 fail 線是 250k 而不是 200k
 *
 * `open/42` 自己的預測表寫「樂觀 ≈165k(−65%)／保守 ≈250k(−48%)」。
 * 第一版把 fail 線畫在 200k —— 那落在票**自己允許的區間中間**,
 * 於是一趟真的跑到 230k 會被判 fail,而 230k 在票的預測裡是正常的。
 * 那又是一次判準比它要守的東西窄。
 *
 * B4 的意思是「成本降到能定價」:250k 相對 08-17 實測的 477k 是 −48%,已經能定價;
 * **165k 是目標,不是門檻。** 所以:
 *
 * | 值 | 判定 | 意思 |
 * | --- | --- | --- |
 * | ≤ 200k | pass | 到了樂觀區間,B4 完全達標 |
 * | 200k~250k | **warn** | 在票允許的保守區間內。能定價,但值得記一筆 |
 * | > 250k | fail | 超出票自己的預測,Fix 1 沒有生效或另有成因 |
 *
 * ## 為什麼切片的線是 2 而不是 0
 *
 * 閘門文件寫「7 → 0」,而那個 0 假設 Fix 2 會落地。`42` 實測那 9 次浪費裡
 * 7 次是「只有下界」(Fix 1 修的)、2 次是**完全沒索引**(ch1-4~1-6 與 ch10),
 * 而後者只有 Fix 2(節層級閘門,已決定延後)處理得掉。
 * **Fix 1-only 的一趟必然剩 2 —— 2 不是折衷,是推導出來的。** 所以沒有 warn 帶。
 *
 * 數字寫在這裡而不是文件裡,因為文件不會在超標時變紅。
 */
export const BASELINE_THRESHOLD_LIMITS: ReadonlyArray<{
  readonly key: string;
  /** Info: (20260818 - Emily) 小於等於此值 → pass */
  readonly passAtOrBelow: number;
  /** Info: (20260818 - Emily) 大於此值 → fail;介於兩者之間 → warn(無 warn 帶時與 passAtOrBelow 相同) */
  readonly failAbove: number;
  readonly unit: string;
}> = [
  {
    key: "log_input_tokens",
    passAtOrBelow: 200_000,
    failAbove: 250_000,
    unit: "token",
  },
  // Info: (20260818 - Emily) 沒有 warn 帶:Fix 1-only 的期望值就是 2,不是「大約 2」
  { key: "log_切片_根本沒切", passAtOrBelow: 2, failAbove: 2, unit: "次" },
];
