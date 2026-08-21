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
      /**
       * Info: (20260818 - Emily) 整段的表被丟(`validateSourceTables` 的數量上限那條路)。
       * 與 `log_丟表` 同一層:非空就是一整段的表不見了。
       * 它沒有 `tableNo` 可回溯,所以分開記 —— 理由見 uat 腳本裡那段註解。
       */
      "log_丟整批表",
      // Info: (20260818 - Emily) 完整性:33 節與目錄不是統計量,是齊或不齊
      "大綱節數",
      "未出現的節",
      /**
       * Info: (20260819 - Emily) 標題被印兩次。與「未出現的節」同一層,只是方向相反:
       * 一個擋少印、一個擋多印。08-19 兩趟在第七章這一項上不同,
       * 而當時的 must_match 清單裡沒有它 —— 於是兩趟被報成「0 項差異」。
       */
      "重複的標題",
      "目錄對不上的條目",
      "log_tocMissing",
      /**
       * Info: (20260819 - Emily) 紙面上宣告別的揭露框架。與「未出現的節」同一層:
       * 不是統計量,是齊或不齊。現行預設框架是 ISO 14064-1,
       * 而未進金管會適用時程的公司不得聲明遵循 IFRS 永續揭露準則 ——
       * 紙上出現一次就是一次合規風險,不是「次數變多才有問題」。
       * `open/54` 的框架選擇落地後改成依框架分流(選 IFRS 時應該出現)。
       */
      "紙上宣告別的揭露框架",
      /**
       * Info: (20260819 - Emily) 排放流向圖(桑基圖)。「圖在」或「說明它為什麼不在」
       * 二者之一即可,兩者都沒有才是缺陷 —— 與 `open/48` 同一個原則:失敗要留下痕跡。
       * 列 must_match 的理由:圖不見了不是統計量,是有或沒有。
       */
      "桑基圖既不在紙上也沒說明",
      /**
       * Info: (20260819 - Emily) `open/53` 的過渡判準:圖表仍標範疇制,
       * 所以紙上出現「範疇」時必須有範疇↔類別的對照說明。
       * `53` 真修(改分組鍵)之後改成「不得出現範疇」。
       */
      "紙上有範疇卻沒有類別對照說明",
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
      /**
       * Info: (20260819 - Emily) markdown 表格語法外洩。與 mermaid 那條同一層:
       * 出現就代表某一張表沒被渲染成表,紙上是 `|---|---|`。
       * 08-19 run2 實測 19 條分隔列,另外三趟都是 0 —— 非決定性,所以必須完全相同。
       */
      "markdown 表格語法外洩",
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
      /**
       * Info: (20260819 - Emily) `open/36` 的兩個鍵。放 record_only 的理由與
       * `47` 相同:`36` 延到 post-launch,列進 must_match 會讓 B3 永遠過不了。
       * 08-19 實測兩趟 12 與 13 處且集合不同(run1 有 9.2、run2 有 1.1/1.3)。
       * `36` 修好之後升到 must_match。
       */
      "節標題重印",
      "節標題重印_剝號後仍同文",
      "log_chartsRendered",
      "log_chartsFailed",
      "log_圖表被拒",
      "log_llm_呼叫次數",
      "log_切片_切成功",
      "log_切片_切了但退回",
      "log_索引缺的節",
      "log_接回折斷列",
      "log_補分隔列",
      "log_分隔列放棄補",
      "log_補欄",
      "log_tounicode_decision",
      "log_tounicode_replaced",
      "CMap串流數",
      "CMap條目數",
      "CMap來源側最大碼",
      /**
       * Info: (20260818 - Emily) 08-17 Luphia 在 PR review 追加的分流所產生的鍵
       * (`scripts/uat_carbon_report.ts` 的 `destinationUnmapped`)。
       *
       * `repairPdfToUnicode` 刻意不碰**沒有對照可用**的碼位(U+2EA1 那種變體部首,
       * 猜錯是把字改成別的字,比搜不到更糟)。所以這個數字不是「修補失效」,
       * 而是「`SUPPLEMENT_MAP` 該長大」的清單 —— 它在腳本裡本來就是 warn。
       *
       * 放 record_only 而不是 must_match 有兩個理由:
       *
       * 1. 它隨**內容**變動:用到哪些字取決於那一趟產出的文字
       *    (08-18 兩趟字元數 60,747 vs 61,551),所以要求兩趟相同會製造假失敗。
       * 2. **使用者看得到的那一端已經有 must_match 守著了** —— `相容區部首`
       *    量的是抽回來的**文字層**,而那正是 Ctrl+F 搜不到的直接症狀,它在必須相同的層且必須是 0。
       *    這個鍵量的是 CMap 的**結構**,是同一件事的上游;下游守住了,上游只需要記錄。
       */
      "CMap 目標側無對照",
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
/**
 * Info: (20260818 - Emily) 活動數據 0 筆時的層級 —— **三種 0 不是同一件事。**
 *
 * ## 為什麼要降級
 *
 * B1（活動數據進帳本）**於 2026-08-17 從上線閘門移除**：
 * `data/issue_drafts/open/_INDEX.md` 的 P0 清單只有 `44`／`47`／`48`／`42`，
 * 而 `open/46`（活動數據可追溯鏈）被列在 **P1**，理由是「高興昌沒提供，是下一份客戶的需求」——
 * 那份報告的 `表3.4` 是活動數據的**種類**而不是**數量**，所以抽不到數量是**正確行為**。
 *
 * 但這支腳本仍把它記成 `fail`。08-18 實跑兩趟因此各出現一個 ✗，exit 1 ——
 * **判準留在原地，而它要守的東西搬走了。** 一支會為了已撤銷的判準而紅的驗收腳本，
 * 下一次真的紅的時候沒有人會相信它。
 *
 * ## 為什麼不是整條降成 warn
 *
 * 三種 0 的成因完全不同，只有第三種是「來源沒有」：
 *
 * | 情形 | 意思 | 層級 |
 * | --- | --- | --- |
 * | `asked === 0` | 沒有任何呼叫帶 `withActivities:true` | **fail** —— 前端旗標沒送，管線斷了 |
 * | `hasKey === 0` | 有要求，但模型每次都不回 `activities` 這個鍵 | **fail** —— prompt / required 壞了 |
 * | 其餘 | 模型有回這個鍵，內容是空陣列 | **warn** —— 08-17 決議的那一種：來源沒有數量 |
 *
 * 這個切法順便提供了退化防線：哪天它從「回了空陣列」掉成「根本不回這個鍵」，
 * 層級會自己從 warn 變回 fail —— **不需要另外加一條判準去守它。**
 *
 * 08-18 兩趟實測都是第三種（asked 2、hasKey 1、accepted 0）。
 */
export const activityDataLevel = (counts: {
  readonly asked: number;
  readonly hasKey: number;
  readonly accepted: number;
}): "pass" | "warn" | "fail" => {
  if (counts.accepted > 0) return "pass";
  if (counts.asked === 0) return "fail";
  if (counts.hasKey === 0) return "fail";
  return "warn";
};

/**
 * Info: (20260818 - Emily) log 格式正規化 —— **這是一個會靜默說謊的陷阱。**
 *
 * 驗收腳本的判準寫的是終端那種格式:
 *
 * ```
 * [INFO] [ReportImportService] source table dropped (…) {"tableNo":"表2.1",…}
 * ```
 *
 * 而 Next.js 16 另外寫一份 `.next/dev/logs/next-development.log`,格式是 JSON-lines,
 * 訊息在 `message` 欄位裡,**裡面的引號是轉義的**:
 *
 * ```
 * {"timestamp":"00:11:09","level":"INFO","message":"[INFO] … {\"tableNo\":\"表2.1\"}"}
 * ```
 *
 * 於是 `"tableNo":` 這種帶引號的正規表示式**一條都不會中**（實測 5 條全部 0 次）。
 * 而後果不是報錯,是 `log_丟表 = []` → 回報「log:原文表格被丟 0 張」→ ✓。
 * **把 `--log` 指到 Next 那份檔案,會得到一份看起來完美的驗收報告。**
 *
 * 08-18 那兩趟就是這樣差點被誤讀的（那份 log 是唯一存在的紀錄,因為當時沒有 tee）。
 * 所以這裡自動辨識:能解析成帶 `message` 的 JSON 就取出 `message`,否則原樣返回。
 * 兩種格式都吃,而且不必要求任何人記得先轉檔 —— **要求人記得的護欄等於沒有護欄。**
 */
export const normalizeUatLog = (raw: string): string =>
  raw
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("{")) return line;
      try {
        const parsed: unknown = JSON.parse(trimmed);
        const message = (parsed as { message?: unknown }).message;
        return typeof message === "string" ? message : line;
      } catch {
        // Info: (20260818 - Emily) 不是 JSON 就當終端格式,原樣交出去(不猜、不丟)
        return line;
      }
    })
    .join("\n");

/**
 * Info: (20260818 - Emily) 沒量到閾值時該報 warn 還是 fail。
 *
 * ## 為什麼要分
 *
 * 08-18 實跑兩份報告:20 通過 / 0 失敗 / 2 警告,exit 0 —— **而 B4 的兩個門檻根本沒判**,
 * 因為那一趟沒帶 `--log`。掛到 CI 上就是綠燈,而兩個閘門項目沒有被檢查。
 * 那是判準蓋不住它要守的東西,只是這次方向是「寬」而不是「窄」。
 *
 * ## 判準:有 `--baseline` 就是驗收趟
 *
 * 不另外加旗標。**「我拿了一份基準線來比」正好是「我在做驗收」最可靠的訊號** ——
 * 探索性地看一份 PDF 不會去比基準線,而驗收一定會(B3 的定義就是兩趟比對)。
 * 多一個 `--strict` 只會多一個沒人記得帶的參數。
 *
 * ## 為什麼 `hasLog` 不影響層級
 *
 * 帶了 `--log` 但 log 裡沒有那些鍵(例如 log 被截斷、或那一趟根本沒觸發匯入),
 * 結果一樣是**沒判**。門檻的意義是「量到而且過關」,量不到就不能算過 ——
 * 這個參數只用來決定訊息要說「沒有 log」還是「log 裡沒有這些鍵」。
 */
export const unmeasuredThresholdLevel = (context: {
  readonly hasBaseline: boolean;
  readonly hasLog: boolean;
}): "warn" | "fail" => (context.hasBaseline ? "fail" : "warn");

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
