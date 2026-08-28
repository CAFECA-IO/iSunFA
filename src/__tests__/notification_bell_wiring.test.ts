import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { NextRequest } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

import { GET as getSummary } from "@/app/api/v1/user/notifications/summary/route";
import { GET as getList } from "@/app/api/v1/user/notifications/route";
import { POST as postReadOne } from "@/app/api/v1/user/notifications/[notification_id]/read/route";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import {
  getNotificationSummary,
  listNotifications,
  markNotificationRead,
} from "@/services/notification.service";
import type { INotificationSummary } from "@/interfaces/notification";

/**
 * Info: (20260821 - Luphia) 小鈴鐺的**接線**（checklist §1.7）。
 *
 * 三支 route 的身分驗證與 service 委派、recorder 真的會發完成通知、
 * 前端真的掛上鈴鐺——功能各自正確而沒接上，是這個 repo 已經付過學費的形狀
 * （`/auth/me` 從來沒回過 plan 就是同一類）。
 */

jest.mock("@/lib/auth/dewt", () => ({
  getIdentityFromDeWT: jest.fn(async () => ({
    id: "user-1",
    address: "0xabc",
  })),
}));

jest.mock("@/services/notification.service", () => ({
  /**
   * Info: (20260826 - Julian) 替身要回**真 service 回的每一個欄位**（review B6）。
   *
   * 原本它只回兩個計數，而下面的斷言又用 `toEqual` 把「payload 只有兩個欄位」
   * 主動釘住 —— 於是把 route 改成 `jsonOk({ todoCount, completedCount })`
   * 之後 `tsc`、`npm test`、`test:e2e` 全綠，而前端 `arrivalKeyOf` 拿到的
   * `latestUnreadAt` 變成 `undefined`，抵達識別值退回舊的「數量組合」——
   * 計畫書 D17 原樣復活，且照它自己的說法「沒有任何觀測量」。
   *
   * 給一個**非 null** 的值：`null` 與「欄位不存在」在 `toEqual` 底下分得出來，
   * 但一個真的時間戳讓「有沒有原封不動送出去」也被驗到。
   */
  getNotificationSummary: jest.fn(async () => ({
    todoCount: 2,
    completedCount: 1,
    latestUnreadAt: 1_760_000_000_000,
  })),
  listNotifications: jest.fn(async () => ({
    todos: [],
    completed: [],
    hasMoreCompleted: false,
  })),
  markNotificationRead: jest.fn(async () => true),
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

/**
 * Info: (20260826 - Julian) 逐則已讀的 handler 需要 `params`。
 *
 * 這些測試原本打的是 `POST /notifications/read`（全部標為已讀）—— 那支端點
 * 與它的 service 已於 20260826 移除：逐則已讀上線之後它就沒有任何呼叫端，
 * 而留著要養限流登記、兩支測試的條目、以及一段描述已取消行為的註解。
 *
 * 這裡把每一條斷言**搬到逐則那支**而不是刪掉：它們驗的是身分來源、
 * body 不可信、未登入擋下 —— 三件事在新的端點上一樣要成立，
 * 而它才是今天真的會被打到的路徑。
 */
const ONE_ID = { params: Promise.resolve({ notification_id: "n-1" }) };

function req(path: string, method = "GET"): NextRequest {
  return new NextRequest(
    `https://isunfa.com/api/v1/user/notifications${path}`,
    {
      method,
      headers: { authorization: "Bearer dewt" },
      ...(method === "POST" ? { body: "{}" } : {}),
    },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  asMock(getIdentityFromDeWT).mockResolvedValue({
    id: "user-1",
    address: "0xabc",
  });
});

describe("三支 route 的接線", () => {
  it("summary：驗身分並原封不動回三個欄位", async () => {
    const response = await getSummary(req("/summary"));
    const body = (await response.json()) as {
      payload: INotificationSummary;
    };

    /**
     * Info: (20260826 - Julian) `toEqual` 連 `latestUnreadAt` 一起釘（review B6）。
     *
     * 這一行是 D17 唯一的自動守門人：少了它，把那個欄位從 route 拿掉不會有
     * 任何測試變紅，而症狀是「提示音第二次抵達起永久失效」——一個
     * 在畫面上完全看不見的失效。
     *
     * 型別用 service 那份（`INotificationSummary`），不要在這裡手寫欄位：
     * 手寫的話，端點加欄位時這個斷言會紅得莫名，而端點**少**欄位時
     * 手寫的型別剛好幫忙掩蓋。
     */
    expect(body.payload).toEqual({
      todoCount: 2,
      completedCount: 1,
      latestUnreadAt: 1_760_000_000_000,
    });
    expect(asMock(getNotificationSummary)).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", address: "0xabc" }),
    );
  });

  /**
   * Info: (20260825 - Julian) 身分**取自 `Authorization` header**。
   *
   * 替身不看參數的話，把 `request.headers.get("Authorization")` 改成
   * 別的 header 名（全站每個人都變 401）不會讓任何測試變紅 ——
   * 被 mock 的參數在測試裡是死的，而那正是你想測的東西（§一.8）。
   */
  it("三支 route 都以 Authorization header 換身分", async () => {
    await getSummary(req("/summary"));
    await getList(req(""));
    await postReadOne(req("/n-1/read", "POST"), ONE_ID);

    expect(asMock(getIdentityFromDeWT)).toHaveBeenCalledTimes(3);
    asMock(getIdentityFromDeWT).mock.calls.forEach((call) => {
      expect(call[0]).toBe("Bearer dewt");
    });
  });

  it("list：委派給 service", async () => {
    const response = await getList(req(""));

    expect(response.status).toBe(200);
    expect(asMock(listNotifications)).toHaveBeenCalledTimes(1);
  });

  it("read：委派給 service 並回是否標記成功", async () => {
    const response = await postReadOne(req("/n-1/read", "POST"), ONE_ID);
    const body = (await response.json()) as { payload: { read: boolean } };

    expect(body.payload.read).toBe(true);
    expect(asMock(markNotificationRead)).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", notificationId: "n-1" }),
    );
  });

  /**
   * Info: (20260825 - Julian) 收件人恆為 session 身分，**不從 body 取**。
   *
   * 原本的測試送的 body 是 `{}`，所以把 `userId: user.id` 改成
   * `(await request.json()).userId ?? user.id` 會落回 `user-1` 而照樣綠 ——
   * 而生產上任何人都能把別人的通知標成已讀（§一.9：判準與缺陷相容）。
   * 這條送一個**不同的** userId，讓那個變異無處可躲。
   */
  it("read：body 裡的 userId 一律無效", async () => {
    const response = await postReadOne(
      new NextRequest("https://isunfa.com/api/v1/user/notifications/n-1/read", {
        method: "POST",
        headers: { authorization: "Bearer dewt" },
        body: JSON.stringify({ userId: "someone-else" }),
      }),
      ONE_ID,
    );

    expect(response.status).toBe(200);
    expect(asMock(markNotificationRead)).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1" }),
    );
  });

  it.each([
    ["summary", () => getSummary(req("/summary"))],
    ["list", () => getList(req(""))],
    ["read", () => postReadOne(req("/n-1/read", "POST"), ONE_ID)],
  ])("%s：未登入一律擋下", async (_label, call) => {
    asMock(getIdentityFromDeWT).mockResolvedValue(null);

    const response = await call();

    /**
     * Info: (20260825 - Julian) 精確值而非 `not.toBe(200)`（§一.9）。
     * `not.toBe(200)` 把 401 / 403 / 500 全部塌成「通過」，於是把
     * `AUTH_INVALID_TOKEN` 換成 `IS_UNKNOWN`（401 → 500，前端的錯誤分流
     * 全壞、5xx 指標被污染）照樣綠。寫 401 是零成本。
     */
    expect(response.status).toBe(401);
    expect(asMock(getNotificationSummary)).not.toHaveBeenCalled();
    expect(asMock(listNotifications)).not.toHaveBeenCalled();
    expect(asMock(markNotificationRead)).not.toHaveBeenCalled();
  });
});

/**
 * Info: (20260825 - Julian) 把註解剝乾淨再比對。
 *
 * 原本只濾掉 `*` 與 `//` 開頭的行，於是用 `/* ... *\/` 把整段包起來時
 * 那些行仍然留在字串裡 —— **通知整段被註解掉，掃描照樣綠**。
 * 現在先移除區塊註解、再移除行註解。
 *
 * 這仍然是字串比對，不是接線測試。真正的接法是匯入 recorder 本體，
 * 但它拉進檔案系統、Prisma 與五支 repo，成本不小；在那之前
 * 這裡至少不能被一個 `/*` 騙過去。
 */
function codeOf(...segments: string[]): string {
  return readFileSync(join(process.cwd(), ...segments), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !line.startsWith("//"))
    .join("\n");
}

describe("來源與畫面的接線（掃描）", () => {
  /**
   * Info: (20260821 - Luphia) recorder 在結果落地後發完成通知。
   * 順序有意義：先 `updateAnalysisResult` 再 `notifyAnalysisCompleted`——
   * 反過來會通知一份還不存在的結果。
   */
  it("recorder 在寫入結果之後發完成通知", () => {
    const recorder = codeOf("src", "services", "issue.recorder.service.ts");
    const write = recorder.indexOf("updateAnalysisResult(analysis.id");
    const notify = recorder.indexOf("notifyAnalysisCompleted(");

    expect(write).toBeGreaterThan(-1);
    expect(notify).toBeGreaterThan(write);
  });

  /**
   * Info: (20260825 - Julian) 分析**失敗**也要發通知（計畫書 D16）。
   * 只通知成功等於只在不需要通知的時候通知。
   */
  it("recorder 在訂單轉為失敗時發失敗通知", () => {
    const recorder = codeOf("src", "services", "issue.recorder.service.ts");

    expect(recorder).toMatch(/becameFailed/);
    expect(recorder).toMatch(/notifyAnalysisFailed\(/);
  });

  /**
   * Info: (20260827 - Julian) 完成通知在 `if (order)` **之外**（驗收清單 a1e）。
   *
   * `analysis` 可以在 `order` 為 null 時存在（以 context 的 `analysisId` 找到分析，
   * 但 orderId 反查不到訂單）。把通知搬進 `if (order)` 會讓那個情況連完成通知
   * 一起消失 —— 而使用者付了錢、分析跑完了，什麼都收不到。
   *
   * 端到端造不出這個情境：`Analysis.orderId` 有外鍵指向 `Order`，資料庫層
   * 就不允許一筆 analysis 掛在不存在的訂單上。所以這條只能用原文的**位置**來釘。
   * 掃描型測試在這裡站得住的理由：搬動位置不會讓 `tsc` 或 `lint` 有任何意見。
   */
  /**
   * Info: (20260828 - Julian) 付款到帳之後要釋放「等付款」的可接續任務。
   *
   * 邏輯放在 `releasePaymentBlockedJobs`（可測），TxTracker 只有一行接線 ——
   * 因為 `order.tracker.service.ts` 沒有測試檔，而它 import `publicClient` 與
   * `viem`，為它寫第一支測試是替既有服務補課，範圍會失控。
   *
   * 所以這裡掃描「那一行在不在」。**它證明不了真的付款時會走到那裡** ——
   * 那一項要在跑得動鏈上流程的環境真的付一次款，與驗收清單的 `p1` 同一種形狀。
   */
  it("TxTracker 標 PAID 之後呼叫 releasePaymentBlockedJobs", () => {
    const tracker = codeOf("src", "services", "order.tracker.service.ts");
    const paid = tracker.indexOf("ORDER_STATUS.PAID");
    const release = tracker.indexOf("releasePaymentBlockedJobs(");

    expect(paid).toBeGreaterThan(-1);
    expect(release).toBeGreaterThan(paid);

    /**
     * Info: (20260828 - Julian) 不擋主流程：訂單已經標成 PAID 了，
     * 這一步失敗不該讓整輪追蹤中止（後面的訂單會跟著停在 PENDING）。
     */
    expect(tracker).toMatch(/try \{[\s\S]{0,120}releasePaymentBlockedJobs\(/);
  });

  it("完成通知不在 if (order) 區塊裡", () => {
    const recorder = codeOf("src", "services", "issue.recorder.service.ts");
    const notify = recorder.indexOf("notifyAnalysisCompleted(");
    const orderBlock = recorder.indexOf("if (order) {");

    expect(notify).toBeGreaterThan(-1);
    expect(orderBlock).toBeGreaterThan(-1);
    expect(notify).toBeLessThan(orderBlock);
  });

  it("header 真的掛上鈴鐺", () => {
    const header = codeOf("src", "components", "header", "user_actions.tsx");

    /**
     * Info: (20260825 - Julian) 連同「有沒有被關掉」一起看。
     * 只比對 `<NotificationBell />` 的話，改成 `{false && <NotificationBell />}`
     * 仍然 match，而鈴鐺會消失。
     */
    expect(header).toMatch(/<NotificationBell \/>/);
    expect(header).not.toMatch(/false\s*&&\s*<NotificationBell/);
  });

  /**
   * Info: (20260826 - Julian) 掃描根要涵蓋**每一個掛得到鈴鐺的 shell**（review T9）。
   *
   * 上一條只驗 `user_actions.tsx` 自己 —— 而鈴鐺出現在畫面上需要兩件事：
   * 那個元件掛了鈴鐺，**而且**外層 shell 掛了那個元件。先前拿掉
   * `user_header.tsx` 的 `<UserActions>` 之後，整個 `/user/*` 的鈴鐺會消失，
   * 而兩支測試全綠（檢查清單 §1.1：掃描型測試的價值等於它的掃描根）。
   *
   * 這份清單是**現況**：三個 shell 今天都掛著。薪資計算機頁該不該有鈴鐺
   * 仍是未決的產品決定（計畫書 §6 第 4 項）—— 決定要拿掉的時候，
   * 這條會紅，而那正是它該做的事：讓移除變成一個決定，不是一次順手。
   */
  it.each([
    ["src", "components", "user", "user_header.tsx"],
    ["src", "components", "landing_page", "header.tsx"],
    ["src", "components", "salary_calculator", "calculator_header.tsx"],
  ])("%s/%s/%s/%s 掛著 UserActions（鈴鐺才到得了畫面）", (...segments) => {
    const shell = codeOf(...segments);

    expect(shell).toMatch(/<UserActions\b/);
    expect(shell).not.toMatch(/false\s*&&\s*<UserActions/);
  });

  /**
   * Info: (20260826 - Julian) 反面：HR shell **不**掛（產品決定，計畫書 D15）。
   *
   * 沒有這一條的話，上面那張清單只證明「有的地方有」，不證明
   * 「該沒有的地方沒有」—— 而 D15 正是因為 HR 留了一顆假鈴鐺才被記下來。
   */
  it("HR shell 不掛 UserActions", () => {
    const hrHeader = codeOf(
      "src",
      "components",
      "hr_management",
      "hr_header.tsx",
    );

    expect(hrHeader).not.toMatch(/<UserActions\b/);
  });

  /**
   * Info: (20260825 - Julian) HR shell 不留假鈴鐺（計畫書 D15）。
   *
   * 那顆 `disabled` 的 `<Bell />` 提示「功能開發中」，而隔壁 shell 的鈴鐺
   * 是活的 —— 兩顆長得幾乎一樣。產品決定這一版不上，那就不要留一顆
   * 把「還沒做」偽裝成「壞掉了」的按鈕。
   */
  it("HR header 沒有停用的假鈴鐺", () => {
    const hrHeader = codeOf(
      "src",
      "components",
      "hr_management",
      "hr_header.tsx",
    );

    expect(hrHeader).not.toMatch(/<Bell\b/);
  });

  /**
   * Info: (20260826 - Julian) 移除假鈴鐺**不得**順手刪掉旁邊的東西（review B4）。
   *
   * 上面那條只驗「Bell 不見了」，於是把整個使用者選單一起刪掉也是綠的 ——
   * 而那實際發生了：D15 的改動連 `MenuItems`、登出按鈕、員工編號與職稱副標
   * 一起移除，換成一顆 `disabled` + `feature_pending` 的頭像按鈕。
   * HR shell 因此**沒有任何登出路徑**，使用者只能自己改網址回主站，
   * 共用平板換人時前一個人的 session 會留著。
   *
   * 「只驗刪掉了什麼」的測試擋不住刪過頭 —— 必須同時驗**留下了什麼**
   *（檢查清單 §1.11）。這一組就是那另一半。
   */
  it("HR header 仍然有可用的登出路徑", () => {
    const hrHeader = codeOf(
      "src",
      "components",
      "hr_management",
      "hr_header.tsx",
    );

    // Info: (20260826 - Julian) 三件缺一不可：拿得到 logout、掛在 onClick 上、有文案
    expect(hrHeader).toMatch(/useAuth\(\)/);
    expect(hrHeader).toMatch(/logout/);
    expect(hrHeader).toMatch(/onClick=\{logout\}/);
    expect(hrHeader).toMatch(/header\.logout/);
  });

  /**
   * Info: (20260826 - Julian) 登出不能被關在一顆 `disabled` 的按鈕後面。
   *
   * 這是被誤刪的那行註解原本警告的事：「不標 `feature_pending`：灰掉會讓人
   * 不去點它，而登出就在裡面」。註解被刪掉之後，那個警告就只存在於 git 歷史裡。
   *
   * 驗的是 `MenuButton` 這一段不帶 `disabled` —— 搜尋鈕仍然可以是 disabled
   * （它真的還沒做，而且裡面沒有任何必要功能）。
   */
  it("使用者選單的觸發鈕不是 disabled（登出在裡面）", () => {
    const hrHeader = codeOf(
      "src",
      "components",
      "hr_management",
      "hr_header.tsx",
    );

    const menuButton = /<MenuButton[\s\S]*?>/.exec(hrHeader)?.[0] ?? "";

    // Info: (20260826 - Julian) 前提：真的找到 MenuButton（找不到的話上一行是空字串，恆綠）
    expect(menuButton).toMatch(/aria-label/);
    expect(menuButton).not.toMatch(/\bdisabled\b/);
    expect(menuButton).not.toMatch(/feature_pending/);
  });

  /**
   * Info: (20260826 - Julian) 共用平板換人時，登出前要看得出現在是誰。
   *
   * 員工編號與職稱副標也在那次一起被刪掉。它們不是裝飾：這個 shell 的
   * 使用情境就是工地共用平板，而 `useAuth()` 的名字是 Google 帳號顯示名稱，
   * 與人事系統裡的身分未必相同（原檔註解已經寫過這件事）。
   */
  it("HR header 顯示得出員工編號與職稱", () => {
    const hrHeader = codeOf(
      "src",
      "components",
      "hr_management",
      "hr_header.tsx",
    );

    expect(hrHeader).toMatch(/employeeNo/);
    expect(hrHeader).toMatch(/displayRole/);
  });

  it("搖動動畫的 keyframes 存在", () => {
    const css = readFileSync(
      join(process.cwd(), "src", "app", "globals.css"),
      "utf8",
    );

    expect(css).toMatch(/@keyframes bell-shake/);
    expect(css).toMatch(/\.animate-bell-shake/);
    /**
     * Info: (20260825 - Julian) 動畫必須尊重 `prefers-reduced-motion`（計畫書 §4）。
     * 這條不受使用者偏好覆寫：系統偏好管的是「這台機器上不要動」。
     */
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.animate-bell-shake/,
    );
  });

  /**
   * Info: (20260825 - Julian) 輪詢與出聲的判斷不得留在元件裡（計畫書 D6–D8）。
   *
   * `testEnvironment` 是 `node`、repo 沒有 jsdom —— 留在元件裡的邏輯
   * 一行都測不到，而這正是「只在計數增加時搖」那條測試退化成
   * 字串比對的原因。搬回去就會紅。
   */
  it("元件不自己輪詢、不自己播音", () => {
    const bell = codeOf("src", "components", "header", "notification_bell.tsx");

    expect(bell).toMatch(/useNotificationSummary\(/);
    expect(bell).not.toMatch(/setInterval\(/);
    expect(bell).not.toMatch(/new AudioCtx\(|AudioContext/);
  });

  /**
   * Info: (20260825 - Julian) 背景分頁要停止輪詢（計畫書 D6）。
   * 少了它，一個丟著不管的分頁每天會打 1440 次摘要（每次兩趟 DB）。
   */
  it("輪詢在背景分頁停止，且回前景會補一次", () => {
    const hook = codeOf("src", "hooks", "use_notification_summary.ts");

    expect(hook).toMatch(/document\.hidden/);
    expect(hook).toMatch(/visibilitychange/);
    expect(hook).toMatch(/inFlightRef/);
  });

  // Info: (20260821 - Luphia) 缺一個語系就是那個語系的鈴鐺整片英文 key
  it.each(["zh_tw", "en", "zh_cn", "ja", "ko"])(
    "%s 有 notification 文案且已註冊進彙整檔",
    (locale) => {
      const dictionary = readFileSync(
        join(
          process.cwd(),
          "src",
          "i18n",
          "locales",
          locale,
          "notification.ts",
        ),
        "utf8",
      );
      /**
       * Info: (20260825 - Julian) 驗**元件實際會讀的每一個鍵**，不是抽兩個。
       * 只驗 2 個的話，刪掉 ja 的 `todos_title` 或把 ko 的 `{{completed}}`
       * 打錯，這條照樣綠而該語系的鈴鐺露出原始 key 或少一個數字。
       */
      [
        "aria",
        "summary",
        "empty",
        "todos_title",
        "completed_title",
        "team_invitation",
        "wallet_upgrade",
        "analysis_completed",
        "analysis_failed",
        // Info: (20260825 - Julian) 帶報告名稱的版本，與未讀紅點的讀屏文字
        "analysis_completed_named",
        "analysis_failed_named",
        "unread",
        /**
         * Info: (20260826 - Julian) `has_more_completed` 改名為 `history_capped`
         * （舊鍵說「還有更多未讀」，但旗標的意思是「歷史超過上限」）。
         * 以下四個是 `/user/notifications` 頁面新增的。
         */
        "aria_unread",
        "load_failed",
        "history_capped",
        "view_all",
        "page_title",
        "history_title",
        "history_empty",
        "total_items",
      ].forEach((key) => {
        expect(dictionary).toMatch(new RegExp(`\\b${key}:`));
      });

      const aggregate = readFileSync(
        join(process.cwd(), "src", "i18n", `${locale}.ts`),
        "utf8",
      );
      expect(aggregate).toMatch(/notification,/);
    },
  );

  /**
   * Info: (20260826 - Julian) D17 的整條鍊子要接起來（review B6）。
   *
   * 上面的 route 契約測試釘住「端點回得出 `latestUnreadAt`」，但那只是第一段。
   * 第二段是「hook 真的把它餵給 `arrivalKeyOf`」—— 少了它，端點照樣回三個欄位，
   * 而 hook 改成 `arrivalKeyOf(0, todo, completed)` 就讓 D17 復活，
   * 且沒有任何測試會紅（`arrivalKeyOf` 自己的單元測試只驗它算得對）。
   */
  it("hook 把 latestUnreadAt 餵給 arrivalKeyOf", () => {
    const hook = codeOf("src", "hooks", "use_notification_summary.ts");

    expect(hook).toMatch(/arrivalKeyOf\(\s*next\.latestUnreadAt/);
  });

  /**
   * Info: (20260826 - Julian) 摘要的型別只能有一份（review B6）。
   *
   * hook 原本自己宣告一份 `INotificationSummary`，再用 `request<...>` 硬轉。
   * 兩份宣告之間沒有任何東西比對過，所以端點少回一個欄位時 `tsc` 不會有意見。
   * 型別是這條路徑上唯一有機會自動發現那件事的東西。
   */
  it("hook 不自己宣告 INotificationSummary，改讀共用型別", () => {
    const hook = codeOf("src", "hooks", "use_notification_summary.ts");

    expect(hook).not.toMatch(/interface INotificationSummary\s*\{/);
    expect(hook).toMatch(/from "@\/interfaces\/notification"/);
  });

  // Info: (20260826 - Julian) 畫面端也一樣：三個消費者都讀同一份
  it.each([
    ["src", "components", "header", "notification_bell.tsx"],
    ["src", "app", "user", "notifications", "page.tsx"],
    ["src", "components", "notification", "notification_row.tsx"],
  ])("%s 讀共用型別而不是自己宣告一份", (...segments) => {
    expect(codeOf(...segments)).toMatch(/from "@\/interfaces\/notification"/);
  });

  /**
   * Info: (20260821 - Luphia) 搖鈴的條件必須是「計數**增加**」：
   * 拿「有沒有未讀」當條件會讓沒收掉的舊通知每分鐘搖一次鈴。
   *
   * Info: (20260825 - Julian) 這條原本是對元件原始碼做 `toMatch(/total > last/)`，
   * 而保留那行文字、把 `playChime()` 搬出 if 就能繞過它。判斷已經搬進
   * `hasNewArrival`，行為由 `notification_sound.test.ts` 真的測（首抓不算、
   * 持平不算、下降不算、上升才算）。這裡只剩接線：元件掛的是 `arrivalTick`，
   * 而它從 0 開始，所以首抓不會觸發。
   */
  it("搖動掛在 arrivalTick 上（首抓的 0 不觸發）", () => {
    const bell = codeOf("src", "components", "header", "notification_bell.tsx");

    expect(bell).toMatch(/arrivalTick === 0/);
    expect(bell).toMatch(/\[arrivalTick\]/);
  });

  /**
   * Info: (20260826 - Julian) 登入摘要氣泡會自動收合。
   *
   * 它沒有關閉鈕、沒有 click-away，而 header 不隨 SPA 換頁卸載 ——
   * 自動收合失效等於那塊 `w-64 z-50` 的氣泡蓋著頁面直到整頁重載。
   *
   * 而失效的方式很安靜：把排程和 `showToast` 放進同一支 effect，
   * `setShowToast(true)` 會讓 React 先跑 cleanup 清掉剛排好的計時器，
   * 重跑時又因 `showToast` 已是 true 而早退。沒有任何錯誤、沒有紅燈，
   * 只有一個永遠不收的氣泡。所以這裡釘的是「排程那支 effect 的 dep」。
   */
  it("摘要氣泡的自動收合是獨立 effect，dep 只有 showToast", () => {
    const bell = codeOf("src", "components", "header", "notification_bell.tsx");

    /**
     * Info: (20260826 - Julian) 從第一支 `useEffect(` **之後**才開始找那個常數。
     * 檔案頂端的 import 也有同一個字，從 0 找會定位到 import 行，
     * 而 import 行沒有 `useEffect(`，往回找會得到 -1。
     */
    const firstEffect = bell.indexOf("useEffect(");
    expect(firstEffect).toBeGreaterThan(-1);
    const at = bell.indexOf("NOTIFICATION_SUMMARY_TOAST_MS", firstEffect);
    expect(at).toBeGreaterThan(-1);

    // Info: (20260826 - Julian) 往回找到包住它的那支 effect，再往後讀它的 dep 陣列
    const start = bell.lastIndexOf("useEffect(", at);
    expect(start).toBeGreaterThan(-1);
    const deps = /\}, \[([^\]]*)\]\);/.exec(bell.slice(start));
    expect(deps).not.toBeNull();
    expect(deps![1].trim()).toBe("showToast");
  });

  /**
   * Info: (20260825 - Julian) 打開鈴鐺**不得**再全部標已讀。
   *
   * 已讀改成逐則觸發之後，這件事有兩個後果，第二個不明顯：
   *
   * 1. 打開就全讀的話，未讀紅點在使用者看清楚之前就全滅了
   * 2. 而且畫面會顯示一整排已讀的歷史，卻沒有任何一則是新的 ——
   *    使用者沒有辦法知道剛剛那一聲鈴是為了哪一則響的
   *
   * 這一條是字串比對，擋不住所有寫法；真正驗行為的是
   * `notification_service.test.ts` 的「只標記被點的那一則」。
   * 這裡擋的是「有人把 openList 的那一行加回去」。
   */
  it("打開鈴鐺不標記已讀，點擊個別通知才標記", () => {
    const bell = codeOf("src", "components", "header", "notification_bell.tsx");

    expect(bell).not.toMatch(/notifications\/read/);
    expect(bell).toMatch(/notifications\/\$\{item\.id\}\/read/);

    /**
     * Info: (20260826 - Julian) 已讀的不再送第二次請求。
     *
     * 少了這道早退，翻歷史時每點一則已讀的通知都是一次 `POST`，
     * 而那支端點的桶是 20 次/分 —— 使用者會被自己的瀏覽行為限流。
     *
     * 紅點怎麼畫的那一條搬到下面的「通知列只有一份實作」：
     * 那段渲染已經移進 `notification_row.tsx`，繼續在這裡比對鈴鐺的原始碼
     * 只會驗到一個已經不在這個檔案裡的東西 —— 也就是永遠紅，或者被刪掉。
     */
    expect(bell).toMatch(/readAt !== null/);
  });
});

/**
 * Info: (20260826 - Julian) 一則通知怎麼畫，只能有一個地方說得算。
 *
 * `/user/notifications` 頁面與鈴鐺畫的是同一種東西。頁面出現時最省事的做法
 * 是把鈴鐺那 90 行（文案、報告名稱、圖示查表、去處、未讀紅點）複製一份，
 * 而複製的兩份會分岔 —— 分岔的形狀是「面板上有報告名稱、頁面上是一句通用的話」，
 * 沒有任何既有測試會紅，也沒有人會回頭同步。
 *
 * 這一組把「共用」釘住：兩個消費者都必須經過 `NotificationRow`，
 * 而決定文案與樣式的那些符號只准出現在那個檔案裡。
 */
describe("通知列只有一份實作", () => {
  const ROW = ["src", "components", "notification", "notification_row.tsx"];
  const BELL = ["src", "components", "header", "notification_bell.tsx"];
  const PAGE = ["src", "app", "user", "notifications", "page.tsx"];

  it("鈴鐺與頁面都用 NotificationRow 畫每一列", () => {
    for (const consumer of [BELL, PAGE]) {
      const code = codeOf(...consumer);
      expect(code).toMatch(
        /from "@\/components\/notification\/notification_row"/,
      );
      expect(code).toMatch(/<NotificationRow/);
    }
  });

  /**
   * Info: (20260826 - Julian) 決定「畫成什麼樣子」的符號只准在共用元件裡。
   *
   * 驗**不存在**而不是驗存在：複製一份回去不會刪掉 `NotificationRow` 的
   * import，所以上一條照樣綠。真正會退化的是「有人在消費端又寫了一次
   * switch (item.type)」，而那一定會用到這幾個符號。
   */
  const MESSAGE_LIB = ["src", "lib", "notification_message.ts"];

  /**
   * Info: (20260826 - Julian) 取「查看全部通知」那個連結的 class 字串。
   * 三條樣式測試都要它，各寫一次正規表示式就是三份會分岔的東西。
   */
  const viewAllClassOf = (bell: string): string =>
    /className="([^"]*)"[\s\S]{0,160}?\{t\("notification\.view_all"\)/.exec(
      bell,
    )?.[1] ?? "";

  /**
   * Info: (20260826 - Julian) 每一個決定只有一個擁有者，而擁有者不只一個檔案。
   *
   * 樣式與去處在 `notification_row.tsx`（畫面決定），文案在
   * `lib/notification_message.ts`（純函式，可逐條測）。表格第三欄記的是
   * 「這個符號該住在哪裡」—— 先前文案也在 row 裡，搬走之後這張表要跟著改，
   * 否則它會繼續指著一個已經不在那裡的東西（與 review B6 同一種病）。
   */
  it.each([
    ["NOTIFICATION_TYPE_STYLE", "圖示與顏色的查表", ROW],
    /**
     * Info: (20260827 - Julian) 去處的擁有者從 ROW 搬到 MESSAGE_LIB（D43）。
     *
     * 以型別為鍵的那一行就是缺陷本身，改成純函式之後這一欄要跟著搬 ——
     * 這正是上方註解說的「表格第三欄記的是這個符號該住在哪裡」。
     */
    ["NOTIFICATION_LINK_PATH", "點下去的去處", MESSAGE_LIB],
    ["ANALYSIS_LINK_PATH_BY_CATEGORY", "分析類別的去處查表", MESSAGE_LIB],
    ["notification.unread", "未讀紅點的讀屏文字", ROW],
    ["analysis_completed_named", "帶報告名稱的文案", MESSAGE_LIB],
    ["analysis.categories.", "報告類別的字典查表", MESSAGE_LIB],
  ])("消費端沒有自己一份 %s（%s）", (symbol, unusedLabel, owner) => {
    for (const consumer of [BELL, PAGE]) {
      expect(codeOf(...consumer)).not.toContain(symbol);
    }
    expect(codeOf(...owner)).toContain(symbol);
  });

  /**
   * Info: (20260826 - Julian) 型別守衛取代硬轉（review：前端細節）。
   *
   * `item.type as NotificationType` 對 API 回來的字串宣稱了一件無法保證的事。
   * 它先前「剛好安全」，靠的是相隔數行的早退 —— 這條擋的是有人把它加回來。
   */
  /**
   * Info: (20260827 - Julian) 列元件不再自己決定去處（D43）。
   *
   * 上面那張表只驗「擁有者含有這個符號」，驗不到「舊的擁有者已經放手」——
   * 而兩個地方同時查表正是分岔的起點：常數層修好了，元件還讀舊的那一格。
   */
  /**
   * Info: (20260827 - Julian) 底部出口的條件要把**兩種**通知都算進去（D45）。
   *
   * 原本是 `list.completed.length > 0 && list.completed.length > 0` ——
   * 同一個判斷寫兩次，而真正的問題是漏了 `todos`：只有待辦（例如一封待接受的
   * 邀請）而沒有完成通知的人，完全找不到 `/user/notifications`。
   *
   * 「空面板不顯示這個入口」是產品決定，所以這裡**不**釘死「必須無條件顯示」。
   * 釘的是那個決定的正確實作：只要條件看了 `completed`，就必須也看 `todos`。
   * 這個形狀擋得住原本那個寫法，又不會讓任何無害的重排變紅。
   */
  /**
   * Info: (20260827 - Julian) 抓清單的時機不得掛回按鈕的 onClick（review）。
   *
   * `PopoverButton` 的 `onClick` 在**開**與**關**都會觸發，於是關閉的那一下
   * 又打了一次 `/api/v1/user/notifications` —— 一次沒有人看的請求，
   * 而它還吃 `NOTIFICATION_READ` 的限流桶（30/分，三支讀取端點共用）。
   *
   * 改成由面板掛載時觸發（`PopoverPanel` 預設關閉即卸載）。這條擋的是
   * 「順手把 onClick 加回去」—— 那個改動不會讓任何工具有意見，
   * 而多打一次請求在畫面上完全看不出來。
   */
  it("清單在面板掛載時抓，不掛在按鈕的 onClick 上", () => {
    const bell = codeOf(...BELL);

    expect(bell).not.toMatch(/onClick=\{openList\}/);
    expect(bell).toMatch(/<LoadListOnOpen\s+onOpen=\{openList\}/);
  });

  it("底部的查看全部連結把待辦也算進條件", () => {
    const bell = codeOf(...BELL);
    const link = bell.indexOf('href="/user/notifications"');

    expect(link).toBeGreaterThan(-1);

    // Info: (20260827 - Julian) 只看連結前面那段條件式，避免掃到清單本身的判斷
    const guard = bell.slice(Math.max(0, link - 260), link);

    expect(guard).toMatch(/completed\.length/);
    expect(guard).toMatch(/todos\.length/);
  });

  /**
   * Info: (20260827 - Julian) `aria-label` 要帶未讀數（D35）。
   *
   * `aria-label` **覆蓋**按鈕的內容，包括那顆徽章 —— 固定字串會讓讀屏使用者
   * 永遠聽不到有幾則。i18n 那條測試只驗 `aria_unread` 這個鍵存在字典裡，
   * 驗不到鈴鐺真的用了它、也驗不到有把 count 傳進去。
   */
  it("鈴鐺的 aria-label 帶未讀數", () => {
    const bell = codeOf(...BELL);

    expect(bell).toMatch(/aria_unread/);
    expect(bell).toMatch(/notification\.aria_unread"?,\s*\{\s*count/);
  });

  /**
   * Info: (20260827 - Julian) 面板的底色與邊框用**定義過的** token（D3）。
   *
   * D3 的成因是 `bg-surface` / `border-border` 這兩個不存在的 class ——
   * 產出無效 class，而 `tsc` 與 `lint` 都不會抱怨，面板就變成透明無邊框。
   * 所以兩件事要一起驗：面板用的是這兩個名字，而這兩個名字在 `globals.css`
   * 真的定義過。少驗後者的話，改名之後這條測試會繼續綠。
   */
  it("面板的底色與邊框 class 在 globals.css 有定義", () => {
    const bell = codeOf(...BELL);

    expect(bell).toMatch(/bg-surface-overlay/);
    expect(bell).toMatch(/border-border-default/);

    const css = readFileSync(
      join(process.cwd(), "src", "app", "globals.css"),
      "utf8",
    );

    expect(css).toMatch(/--color-surface-overlay\s*:/);
    expect(css).toMatch(/--color-border-default\s*:/);
  });

  it("列元件改用 notificationHrefOf，不再自己查去處", () => {
    const row = codeOf(...ROW);

    expect(row).not.toContain("NOTIFICATION_LINK_PATH");
    expect(row).toMatch(/notificationHrefOf\(item\)/);
  });

  it("列元件不對 item.type 硬轉型別", () => {
    const row = codeOf(...ROW);

    expect(row).not.toMatch(/item\.type as NotificationType/);
    expect(row).toMatch(/isNotificationType\(/);
  });

  /**
   * Info: (20260826 - Julian) 未讀紅點靠 `readAt` 判斷，而不是靠「在不在清單裡」。
   *
   * 清單現在含已讀（要能翻歷史），所以「出現＝未讀」這個舊前提已經不成立。
   * 這一條原本釘在鈴鐺上，隨那段渲染一起搬過來。
   */
  it("紅點的判準在共用元件裡", () => {
    expect(codeOf(...ROW)).toMatch(/readAt === null/);
  });

  /**
   * Info: (20260826 - Julian) 「點了算不算已讀」只在共用元件裡決定（review B3）。
   *
   * 兩個消費者原本各自把整份清單（含待辦區）交給同一支 `markOneRead`，
   * 而那支的早退條件 `readAt !== null` 擋不住活算的待辦 —— 點一下團隊邀請
   * 會扣錯徽章的桶、把提示音基準降 1（下一次輪詢就白搖一次）、
   * 並對合成 id 打 API。**兩邊犯的是同一個錯**，因為兩邊各判一次。
   *
   * 這裡驗的是「消費端沒有自己一份判斷」，而不是「有沒有呼叫共用函式」——
   * 後者擋不住有人加回一個 `if`。
   */
  it("待辦型不標已讀的判斷在共用元件裡", () => {
    expect(codeOf(...ROW)).toMatch(/canMarkReadByClick\(/);
    // Info: (20260826 - Julian) 待辦型仍然可點（要導去處理），只是 onClick 不接 onRead
    expect(codeOf(...ROW)).toMatch(
      /onClick=\{.*\?.*onRead\(item\).*undefined\}/s,
    );
  });

  /**
   * Info: (20260826 - Julian) 消費端不得自己列一份待辦型清單。
   *
   * 這一條原本連 `canMarkReadByClick` 一起禁，理由是「規則只能有一個答案處」。
   * 但那禁錯了對象：**呼叫**共用函式不是第二個答案，**重寫**規則才是。
   * 下面那條現在要求兩個消費端都呼叫它（review R-3），兩條合起來的意思是
   * 「同一個判準、可以問很多次」。
   */
  it("消費端沒有自己一份 TODO_NOTIFICATION_TYPES", () => {
    for (const consumer of [BELL, PAGE]) {
      expect(codeOf(...consumer)).not.toContain("TODO_NOTIFICATION_TYPES");
    }
  });

  /**
   * Info: (20260826 - Julian) `markOneRead` 自己要守門，不能只靠 row 不呼叫（review R-3）。
   *
   * 在這之前，兩支 `markOneRead` 的早退只有 `item.readAt !== null` ——
   * 而活算的待辦（團隊邀請）`readAt` 恆為 null，所以那道擋不住它。
   * 唯一沒出事的理由是 `NotificationRow` 不把待辦型的 onClick 接上 onRead：
   * 也就是說，兩支函式的正確性依賴另一個檔案的一個三元運算子。
   *
   * 那不是守門，是巧合。多一個呼叫端、或那個三元運算子被改一次，
   * 缺陷就回來（扣錯徽章的桶、下一次輪詢白搖一次鈴、對合成 id 打 API）。
   *
   * 釘的是「守門在 markOneRead 裡面」而不只是「檔案裡有這個字」：
   * 後者會被一個放在別處的呼叫騙過去。
   */
  it.each([
    [BELL, "鈴鐺"],
    [PAGE, "通知頁"],
  ])("%s 的 markOneRead 第一道守門是 canMarkReadByClick", (consumer) => {
    const code = codeOf(...(consumer as string[]));
    const at = code.indexOf("markOneRead = useCallback");
    expect(at).toBeGreaterThan(-1);

    const body = code.slice(at, at + 900);
    expect(body).toMatch(/canMarkReadByClick\(item\.type\)/);
    // Info: (20260826 - Julian) 兩道都要留：它們擋的是兩件不同的事
    expect(body).toMatch(/item\.readAt !== null/);
  });

  /**
   * Info: (20260826 - Julian) 「讀不到」不得被畫成「沒有」（review R-2）。
   *
   * 鈴鐺這一輪把四態分開了，同一個 PR 的第二個消費者沒有：兩支 catch
   * 都寫成空資料，而待辦區在空資料時整塊不渲染 ——
   * 使用者不會知道自己有一封待接受的邀請。
   *
   * 釘兩件事：catch 裡不准再出現「寫成空」的形狀，且畫面用得到
   * `load_failed` 這個鍵（它五個語系都已經有了）。
   */
  it.each([
    [BELL, "鈴鐺"],
    [PAGE, "通知頁"],
  ])("%s 讀取失敗時說得出「讀不到」", (consumer) => {
    const code = codeOf(...(consumer as string[]));

    expect(code).toMatch(/notification\.load_failed/);
    // Info: (20260826 - Julian) catch 裡把清單寫成空，就是把錯誤說成「沒有」
    expect(code).not.toMatch(/catch\s*\{[^}]*setTodos\(\[\]\)/s);
    expect(code).not.toMatch(/catch\s*\{[^}]*totalItems: 0/s);
  });

  /**
   * Info: (20260826 - Julian) 掛鈴鐺的 shell **不得**自己帶 `backdrop-filter`（實測 20260826）。
   *
   * 這是手機版面板捲不動、底部按鈕點不到的**真正成因**，而我在找到它之前
   * 猜錯了三次（`min-h-0`、`fixed bottom-0`、`modal`）。
   *
   * `backdrop-filter` 與 `transform` 一樣，會讓元素成為子孫 `position: fixed`
   * 的**包含塊**。三個 shell 的 `<header>` 都有 `backdrop-blur-xl`，於是面板的
   * `fixed inset-0 h-dvh` 是相對那個 64px 的 header 定位，不是相對視窗。
   * 瀏覽器實測：面板 top 落在 7742px（視窗高 1083），底部連結跟著跑到
   * 面板頂端下方 —— 正好是截圖裡「按鈕出現在清單上方」的樣子。
   *
   * 修法是把 bg / blur / shadow / ring 移到 `absolute inset-0 -z-10` 的兄弟層：
   * 視覺相同，而 header 不再是包含塊。這條測試擋的是有人把 blur 搬回
   * `<header>` 上 —— 那會讓同一個缺陷無聲復發，而它在桌機上完全看不出來。
   */
  it.each([
    ["src", "components", "user", "user_header.tsx"],
    ["src", "components", "landing_page", "header.tsx"],
    ["src", "components", "salary_calculator", "calculator_header.tsx"],
  ])("%s/%s/%s/%s 的 <header> 自己不帶 backdrop-filter", (...segments) => {
    const shell = codeOf(...segments);
    const headerTag = /<header className="([^"]*)"/.exec(shell);

    expect(headerTag).not.toBeNull();
    // Info: (20260826 - Julian) 毛玻璃要在子層，不在 <header> 自己身上
    expect(headerTag?.[1] ?? "").not.toContain("backdrop-blur");
    expect(shell).toMatch(/absolute inset-0 -z-10[^"]*backdrop-blur/);
  });

  /**
   * Info: (20260826 - Julian) 底部入口的樣式（實測回報 20260826）。
   *
   * 它先前是一行置中的灰色小字，與上面兩個分節標題（「待辦事項」「工作完成」）
   * 幾乎一樣 —— 使用者的原話是「一點都不像按鈕，反而像列表標題」。
   *
   * 現在的設計是**兩種尺寸兩種角色**：手機版整條底色填滿（分節標題不會有的
   * 東西），桌機版切換成面板底部的淡色連結。
   *
   * 斷言只驗**結構**（有沒有底色、有沒有隨尺寸切換、是不是與標題同色），
   * 不驗特定色票 —— 配色是產品隨時可以調的，而把色票寫進斷言，
   * 換一次顏色就要改一次測試，那種測試最後都會被改成通過而不是被讀懂。
   */
  it("底部入口在手機版有底色填滿（分節標題不會有）", () => {
    // Info: (20260826 - Julian) 沒有斷點前綴的 bg-*，也就是手機版就吃得到的底色
    expect(viewAllClassOf(codeOf(...BELL))).toMatch(/(^|\s)bg-\S+/);
  });

  it("底部入口在桌機版換一種樣子", () => {
    const cls = viewAllClassOf(codeOf(...BELL));

    expect(cls).toMatch(/md:bg-\S+/);
    expect(cls).toMatch(/md:text-\S+/);
  });

  /**
   * Info: (20260826 - Julian) 這條才是「像不像標題」的直接判準：
   * 兩個分節標題用 `bg-gray-100`，這個入口必須是別的東西。
   */
  it("底部入口的底色不是分節標題那一種", () => {
    const bell = codeOf(...BELL);

    // Info: (20260826 - Julian) 前提：分節標題真的還在用那個底色
    expect(bell).toContain("bg-gray-100");
    expect(viewAllClassOf(bell)).not.toContain("bg-gray-100");
  });

  /**
   * Info: (20260826 - Julian) 捲動區仍要有 `min-h-0`。
   *
   * 它不是這次的成因（成因是包含塊），但仍是必要條件：flex item 的
   * `min-height: auto` 會讓 `overflow-y-auto` 永遠不生效。兩件事都對，
   * 面板才捲得動 —— 所以兩條測試都留著。
   */
  it("面板的捲動區有 min-h-0", () => {
    expect(codeOf(...BELL)).toMatch(/min-h-0[^"]*flex-1[^"]*overflow-y-auto/);
  });

  /**
   * Info: (20260826 - Julian) `modal` 不得再被加回 `PopoverPanel`。
   *
   * 它給的是 focus trap，但會啟動 HeadlessUI 的 scroll lock，而那在觸控裝置上
   * 靠攔截 `touchmove` 實作 —— 認得 `Dialog` 的面板，未必認得 `PopoverPanel` 的。
   * 正解是改寫成 `Dialog`。
   */
  it("PopoverPanel 沒有 modal（會擋掉觸控捲動）", () => {
    expect(codeOf(...BELL)).not.toMatch(/^\s*modal\s*$/m);
  });

  /**
   * Info: (20260826 - Julian) 鈴鐺底部那句話必須有出口。
   *
   * 它原本是一句沒有任何操作的「還有更多未讀通知」——使用者看得到一個
   * 承諾，點不到對應的東西。而那句話在面板改成保留已讀之後連內容都不對了。
   */
  it("鈴鐺底部有通往完整清單的連結", () => {
    expect(codeOf(...BELL)).toContain('href="/user/notifications"');
  });

  // Info: (20260826 - Julian) 頁面真的存在（上面那條連結不是指向 404）
  it("/user/notifications 頁面存在", () => {
    expect(codeOf(...PAGE)).toMatch(/export default function/);
  });
});
