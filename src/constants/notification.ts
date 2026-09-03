import { ANALYSIS_CATEGORY } from "@/constants/analysis";

/**
 * Info: (20260821 - Luphia) 小鈴鐺通知的常數（ADR 021 補充）。
 *
 * 通知分兩類，**來源刻意不同**：
 *
 * - 待辦型（TODO）：待接受的團隊邀請、系統要求升級錢包。前者是活的狀態，
 *   讀取時向邀請表現算（不存副本——邀請被接受／撤回時通知必須同步消失）；
 *   後者是系統發出的紀錄（存 DB，錢包升級完成後標記已讀）。
 * - 事件型（DONE）：憑證掃描等工作完成。發生時寫入 DB，讀過即已讀。
 */

export const NOTIFICATION_TYPE = {
  // Info: (20260821 - Luphia) 待辦：有一封等你接受的團隊邀請（derived，不入庫）
  TEAM_INVITATION: "TEAM_INVITATION",
  // Info: (20260821 - Luphia) 待辦：系統要求升級錢包（ADR 021 rollout 第 5 步）
  WALLET_UPGRADE: "WALLET_UPGRADE",
  // Info: (20260821 - Luphia) 完成：一份分析／憑證掃描工作跑完了
  ANALYSIS_COMPLETED: "ANALYSIS_COMPLETED",
  /**
   * Info: (20260825 - Julian) 完成：一份分析**失敗**了（計畫書 D16）。
   *
   * 只通知成功等於只在不需要通知的時候通知：使用者付了錢、送出分析、
   * 等了十分鐘，任務失敗 —— 鈴鐺什麼都沒有，頁面上也沒有主動訊息，
   * 他只能自己回去看訂單。而「完成時會通知」的價值有一半在於
   * 他不必回去看。
   *
   * 歸在事件型而不是待辦型：它沒有「處理完」這個狀態，看過就過去了。
   */
  ANALYSIS_FAILED: "ANALYSIS_FAILED",
  /**
   * Info: (20260828 - Julian) 待辦：一個因為點數不足而暫停的任務**可以繼續了**。
   *
   * 歸在待辦型而不是事件型：它不是「一件事發生了」，是「有一件事等你做」——
   * 而且伺服器**做不到**替使用者完成它。智能溫盤的匯入內容是端到端加密的，
   * 逐章迴圈跑在瀏覽器裡，所以接續一定要使用者本人回到那個聊天室按下去。
   *
   * 因此文案不得寫「已為你繼續」（見 `notification_message.ts`），
   * 而它的消失時機是使用者真的按了繼續、或取消了任務 —— 那是活狀態，
   * 所以這一型**活算不入庫**（理由同團隊邀請，見下方 TODO_NOTIFICATION_TYPES）。
   */
  JOB_RESUMABLE: "JOB_RESUMABLE",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

/**
 * Info: (20260821 - Luphia) 待辦型 vs 事件型的分組（摘要那句話的兩個數字）。
 * 收斂在常數層：service 的計數與前端的分節都讀這一份，不各自維護清單。
 */
export const TODO_NOTIFICATION_TYPES: readonly NotificationType[] = [
  NOTIFICATION_TYPE.TEAM_INVITATION,
  NOTIFICATION_TYPE.WALLET_UPGRADE,
  /**
   * Info: (20260828 - Julian) 與邀請同樣是**活算**的：來源是 `ResumableJob.status`，
   * 而它本身就是活狀態（按繼續轉 RUNNING、取消轉 CANCELLED）。
   *
   * 不入庫的具體理由：同一個 `resourceKey` 會暫停 → 繼續 → 再暫停，
   * 而 `dedupeKey` 是永久唯一鍵，入庫的話第二次就發不出來。
   */
  NOTIFICATION_TYPE.JOB_RESUMABLE,
] as const;

/**
 * Info: (20260821 - Luphia) 小鈴鐺的輪詢間隔。
 *
 * 60 秒：通知的來源（邀請、worker 完成的分析）本身都是分鐘級的事件，
 * 更密只是把同一個答案多問幾次。搖動與音效只在**計數增加**時觸發，
 * 所以輪詢頻率不影響打擾頻率。
 */
export const NOTIFICATION_POLL_INTERVAL_MS = 60_000;

// Info: (20260821 - Luphia) 登入摘要氣泡的自動收合時間
export const NOTIFICATION_SUMMARY_TOAST_MS = 8_000;

/**
 * Info: (20260821 - Luphia) 事件型清單一次最多帶回幾則。
 *
 * Info: (20260825 - Julian) 這個上限**只套用在事件型**，而那是靠
 * `listRecentExcludingTypes` 的型別條件做到的，不是靠這行註解。
 *
 * 原本兩種型別共用一支不帶型別條件的查詢，於是「事件型」三個字只是願望：
 * 一則舊的待辦排在 25 則新分析後面就被 `take` 切掉，
 * 而摘要的計數沒有截斷、照樣算它（計畫書 D4）。
 *
 * Info: (20260825 - Julian) 面板改成保留已讀之後，這個數字的意義也變了：
 * 它不再是「未讀太多時的截斷」，而是「歷史要往回看多遠」。
 *
 * Info: (20260826 - Julian) 定為 **10**（產品決定 20260826）。
 *
 * 這個數字曾經一路是 20 → 30 → 10，而三次的理由不同，值得寫清楚，
 * 否則下一個人會讀到一段已經不成立的論證：
 *
 * - 20 的時代它是「未讀太多時的截斷」，理由是別讓面板太長
 * - 30 是為了「未讀會佔掉前面幾則，手上有 5 則未讀的人只看得到 15 則歷史」——
 *   那個論證的前提是**沒有別的地方看得到歷史**
 * - 那個前提已經不成立：`/user/notifications` 是完整的分頁清單。
 *   面板回到它真正的角色 —— 一眼掃過最近發生什麼，而不是翻歷史的地方。
 *   10 則在 70vh 的面板裡不必捲動就看得完。
 *
 * 徽章與清單會不會分岔？會，但有界且說得出來：徽章數的是**所有**未讀，
 * 而未讀落在這個上限之外時 `hasMoreCompleted` 必為 true，
 * 畫面會顯示「僅顯示最近 N 則」並帶一個通往完整清單的連結。
 * 分岔永遠伴隨一個看得見的說明與一個出口。
 *
 * ⚠️ 改這個值請連同 `notification_service.test.ts` 的「上限常數的對外契約」
 * 與 `documents/architecture/notification_module_plan.md` §1 一起改 ——
 * 那支測試存在的理由就是讓這件事不能靜靜發生。
 */
export const NOTIFICATION_HISTORY_LIMIT = 10;

/**
 * Info: (20260826 - Julian) `/user/notifications` 每頁幾則。
 *
 * 與 `NOTIFICATION_HISTORY_LIMIT`（鈴鐺一次帶回 10 則）是兩個不同的數字，
 * 刻意不共用：鈴鐺的 30 是「往回看多遠」，這裡的 20 是「一頁畫幾列」。
 * 綁在一起的話，之後想把面板加長就會連帶改變頁面的分頁大小。
 */
export const NOTIFICATION_PAGE_SIZE = 20;

/**
 * Info: (20260826 - Julian) 單頁筆數的硬上限。
 *
 * `?limit=` 由查詢字串進來，沒有上限時 `limit=100000` 就是一次把整張表
 * 撈進記憶體再序列化 —— 而那不需要任何權限，登入就打得到。
 * 與其他分頁端點的 `max: 100` 同值。
 */
export const NOTIFICATION_PAGE_SIZE_MAX = 100;

/**
 * Info: (20260825 - Julian) 待辦型的上限。
 *
 * 待辦型天然有限（一人最多一則錢包升級），但仍然給一個上限：
 * 「天然有限」是今天的事實，不是資料庫層的約束，而下一個待辦型別
 * 未必有同樣的性質。
 */
export const NOTIFICATION_TODO_LIST_LIMIT = 20;

/**
 * Info: (20260821 - Luphia) dedupe key 的前綴（與訂單 idempotencyKey 同形狀）：
 * worker 重試、腳本重跑都不會發出第二則同一件事的通知。
 */
export const NOTIFICATION_DEDUPE_PREFIX = {
  ANALYSIS_COMPLETED: "analysis-completed:",
  /**
   * Info: (20260825 - Julian) 失敗以 **orderId** 為鍵，不是 analysisId。
   *
   * 失敗的路徑上 `analysis` 可能根本沒有（結果解析不出來、payload 缺漏），
   * 而 order 一定在。一張訂單失敗一次，發一則。
   */
  ANALYSIS_FAILED: "analysis-failed:",
  WALLET_UPGRADE: "wallet-upgrade:",
} as const;

/**
 * Info: (20260825 - Julian) 每一種通知的圖示色與去處，**收斂在常數層**。
 *
 * 原本這兩件事寫在 `notification_bell.tsx` 的一串 `if` 裡，而顏色用的是
 * `text-orange-500` / `text-blue-500` / `text-green-600` 原始色 ——
 * header 的其他子元件一律用語意 token，深色模式下那三個顏色不會跟著換。
 *
 * 比照 `MOVEMENT_ALERT_STYLE` 的做法：**元件不做決定**，
 * 顏色與去處都是查表查出來的。第二個消費者（手機版側欄）出現時
 * 不必把那串 `if` 抄第二份。
 */
export const NOTIFICATION_TYPE_STYLE: Record<
  NotificationType,
  {
    icon: "mail" | "wallet" | "check" | "alert" | "play";
    className: string;
  }
> = {
  /**
   * Info: (20260825 - Julian) 只用 `@theme` 真的定義過的 token。
   *
   * 寫一個沒定義的名字（`text-success` 在 20260825 之前就是）會產出一個
   * 無效 class，而 `tsc` 與 `lint` 都不會抱怨 —— 那正是 D3 的成因。
   *
   * `success` 是這次為了這個模組加的（`globals.css`）：完成與失敗原本
   * 共用 brand 橘與 danger 紅，兩者在 16px 圖示下難以分辨。加 token 而不是
   * 就地寫 `text-green-600`：後者不會跟著深色模式翻，而且在白底只有 3.3:1。
   *
   * 顏色仍然不單獨傳達狀態 —— icon 形狀（打勾／驚嘆號）與文案各自也說得出來，
   * 這是 `movement_alert_badge.tsx` 的既有規則。
   */
  [NOTIFICATION_TYPE.TEAM_INVITATION]: {
    icon: "mail",
    className: "text-brand",
  },
  [NOTIFICATION_TYPE.WALLET_UPGRADE]: {
    icon: "wallet",
    className: "text-brand",
  },
  [NOTIFICATION_TYPE.ANALYSIS_COMPLETED]: {
    icon: "check",
    className: "text-success",
  },
  [NOTIFICATION_TYPE.ANALYSIS_FAILED]: {
    icon: "alert",
    className: "text-danger",
  },
  /**
   * Info: (20260828 - Julian) 用 `play` 而不是沿用 `check`。
   *
   * `check` 說的是「做完了」，而這一則說的是「可以開始了」——
   * 兩者在 16px 的圖示下如果長得一樣，使用者會以為匯入已經完成而不去按。
   * 顏色用 brand：它不是成功也不是警告，是一個邀請。
   */
  [NOTIFICATION_TYPE.JOB_RESUMABLE]: {
    icon: "play",
    className: "text-brand",
  },
};

/**
 * Info: (20260825 - Julian) 每一種通知點下去要去哪裡（站內相對路徑）。
 *
 * `null` = 這一種沒有去處，畫面就不要把它做成可點的東西 ——
 * 一個按了沒反應的待辦比沒有連結更糟（service 自己的註解說過同一件事）。
 * `WALLET_UPGRADE` 目前是 null：**全站沒有任何升級錢包的頁面**
 * （`grep upgrade src/app` 零命中），有了之後把它填進來。
 *
 * 分析類指向 `?tab=history`：`analysis_view.tsx` 的分頁**由網址導出**，
 * 所以使用者會直接落在歷史報告清單。
 *
 * Info: (20260827 - Julian) 這句話一度只有一半成立。那一頁原本把分頁存在
 * state 裡、只在掛載時讀一次網址，於是「人已經在 /analysis 且停在別的分頁」
 * 時點這個連結，網址跳一下就被元件改回去 —— 連結完全沒有作用。
 * 契約由 `analysis_tab_url.test.ts` 守著：那支測試會在任一邊改名時變紅。
 *
 * 逐筆的 `?analysisId=` 要動 `HistorySection`，留待後續。
 */
export const NOTIFICATION_LINK_PATH: Record<NotificationType, string | null> = {
  [NOTIFICATION_TYPE.TEAM_INVITATION]: "/user/team",
  [NOTIFICATION_TYPE.WALLET_UPGRADE]: null,
  [NOTIFICATION_TYPE.ANALYSIS_COMPLETED]: "/analysis?tab=history",
  [NOTIFICATION_TYPE.ANALYSIS_FAILED]: "/analysis?tab=history",
  /**
   * Info: (20260828 - Julian) 深連結到**那一個會話**，並要求到站就把預覽卡打開
   *（`resumable_job_resume_landing_and_copy.md` §2.2）。頁面層級的去處等於把「是哪一份匯入」丟回給使用者判斷，
   * 而側欄同時會有數個盤查對話。
   *
   * `sessionId` 由 `notification.service.ts` 從 `resourceKey` 切出來放進 payload；
   * 切不出來時那個鍵不存在，`resolvePathTokens` 會讓整條回 `null`（不可點）——
   * 那比讓人點到一條 `?session=:sessionId` 好。
   */
  [NOTIFICATION_TYPE.JOB_RESUMABLE]:
    "/user/carbon_chatbot?session=:sessionId&openImport=1",
};

/**
 * Info: (20260827 - Julian) 分析通知的去處，以**類別**為鍵（D43）。
 *
 * ## 為什麼需要第二張表
 *
 * `NOTIFICATION_LINK_PATH` 以**型別**為鍵，而那對邀請與錢包升級是對的 ——
 * 它們沒有類別可言。但分析類只有兩格，卻要對應 15 種 `ANALYSIS_CATEGORY`，
 * 於是「憑證分析失敗」被送到 `/analysis?tab=history`，而那一頁的預設查詢是
 * `type IN [...CATEGORIES]` —— **不含**憑證分析。使用者落在一個結構上放不下
 * 那筆紀錄的頁面，而頁面正常載入、其他分析都在，看起來像資料消失了。
 * 那比 D12 的死連結更難查。
 *
 * ## 這張表只列四種
 *
 * 只有不在 `CATEGORIES` 裡的那四種需要特例；其餘 11 種的正確去處**就是**
 * 型別層那一格。不要為了修 4 種把 11 種也寫成特例 —— 那會讓下一個
 * 加分析類別的人以為每一種都得在這裡登記。
 *
 * ## `:token` 的規則
 *
 * 路徑裡的 `:foo` 由 `payload.foo` 代入（見 `lib/notification_message.ts`
 * 的 `notificationHrefOf`）。
 *
 * Info: (20260831 - Julian) 代入是**逐 token**做的（`/:([A-Za-z0-9_]+)/g`），
 * 不是逐段。這一段原本寫「以 `/` 切，所以 query string 不會被當成 token」——
 * 20260828 的深連結把它改掉了，`?session=:sessionId` 正是靠段內代入生效。
 *
 * 後果值得記在這裡：query string 裡的**冒號字面值**現在會被當成 token。
 * 寫出 `?t=12:30` 這種值時，`:30` 代不出來 → 整條回 `null` → 那一則通知
 * 變成不可點，而且沒有任何錯誤訊息。要放冒號請先 encode（`%3A`）。
 *
 * **任何一個 token 代不進去，整條退化為 `null`**，
 * 渲染成不可點的列 —— 與 D12 同一個判斷：按了沒反應比帶去錯的地方好，
 * 而 `/user/account_book/undefined/journal` 兩者皆是。
 *
 * D43 第二步（20260827）已把 `accountBookId` 補進兩支發射函式的 payload，
 * 所以 `CERTIFICATE_ANALYSIS` 與 `JOURNAL_CORRECTION` 現在組得出去處了。
 * 在那之前它們自動是不可點的 —— 這張表當時**不用改**就跟著生效，
 * 因為意圖寫在這裡，能力由 payload 決定。
 *
 * 那個性質仍然成立：`resolveAccountBookId` 的三層 fallback 全部落空時
 * （舊資料、或沒有帳本的內部任務），這一條照樣退化為不可點，不會產出
 * 一條 404 的合法路徑。
 */
export const ANALYSIS_LINK_PATH_BY_CATEGORY: Record<
  string,
  { completed: string | null; failed: string | null }
> = {
  /**
   * Info: (20260827 - Julian) 失敗那格刻意是列表頁，不是逐筆。
   * `notifyAnalysisFailed` 的 payload 沒有 `analysisId`（失敗路徑上 analysis
   * 未必存在，而 order 一定在），所以逐筆組不出來 —— 給列表頁而不是給 null，
   * 因為列表頁對使用者仍然是有用的去處。
   */
  [ANALYSIS_CATEGORY.AI_CONSULTING]: {
    completed: "/ai_consultation_room/:analysisId",
    failed: "/ai_consultation_room",
  },
  [ANALYSIS_CATEGORY.TRANSPORTATION_CARBON_FOOTPRINT]: {
    completed: "/transportation_carbon_footprint_calculator",
    failed: "/transportation_carbon_footprint_calculator",
  },
  // Info: (20260827 - Julian) 憑證產出的是日記帳／傳票／碳盤查三種紀錄，
  // Info: (20260827 - Julian) 指向日記帳：那是使用者送出的東西，另外兩個是衍生物。
  /**
   * Info: (20260831 - Julian) **待辦（review #6732 R1）：帳本軟刪除之後這條去處會說謊。**
   *
   * `AccountBook.deletedAt` 存在，所以 `onDelete: Cascade` 永遠不會觸發 ——
   * 帳本被軟刪除之後，既有的完成通知仍然連到這裡，而 `:accountBookId` 指向
   * 一本查不到的帳本。通知本身看起來完全正常，症狀只在點下去之後出現。
   *
   * ADR 025 §4 早就寫著「真的出現時要一併決定帳本軟刪除後通知怎麼辦」，
   * 而 `accountBookId` 20260827 進 payload 時**沒有人觸發那個決定**。
   * 三個選項與傾向記在 ADR 025 §4 的「未決」段；產品決定，不在 #6732 範圍。
   */
  [ANALYSIS_CATEGORY.CERTIFICATE_ANALYSIS]: {
    completed: "/user/account_book/:accountBookId/journal?tab=list",
    failed: "/user/account_book/:accountBookId/journal?tab=list",
  },
  [ANALYSIS_CATEGORY.JOURNAL_CORRECTION]: {
    completed: "/user/account_book/:accountBookId/journal?tab=list",
    failed: "/user/account_book/:accountBookId/journal?tab=list",
  },
};
