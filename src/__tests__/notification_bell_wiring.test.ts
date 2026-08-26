import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { NextRequest } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

import { GET as getSummary } from "@/app/api/v1/user/notifications/summary/route";
import { GET as getList } from "@/app/api/v1/user/notifications/route";
import { POST as postRead } from "@/app/api/v1/user/notifications/read/route";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import {
  getNotificationSummary,
  listNotifications,
  markNotificationsRead,
} from "@/services/notification.service";

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
  getNotificationSummary: jest.fn(async () => ({
    todoCount: 2,
    completedCount: 1,
  })),
  listNotifications: jest.fn(async () => ({
    todos: [],
    completed: [],
    hasMoreCompleted: false,
  })),
  markNotificationsRead: jest.fn(async () => 3),
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

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
  it("summary：驗身分並回兩個數字", async () => {
    const response = await getSummary(req("/summary"));
    const body = (await response.json()) as {
      payload: { todoCount: number; completedCount: number };
    };

    expect(body.payload).toEqual({ todoCount: 2, completedCount: 1 });
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
    await postRead(req("/read", "POST"));

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

  it("read：委派給 service 並回已讀數", async () => {
    const response = await postRead(req("/read", "POST"));
    const body = (await response.json()) as { payload: { read: number } };

    expect(body.payload.read).toBe(3);
    expect(asMock(markNotificationsRead)).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1" }),
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
    const response = await postRead(
      new NextRequest("https://isunfa.com/api/v1/user/notifications/read", {
        method: "POST",
        headers: { authorization: "Bearer dewt" },
        body: JSON.stringify({ userId: "someone-else" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(asMock(markNotificationsRead)).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1" }),
    );
  });

  it.each([
    ["summary", () => getSummary(req("/summary"))],
    ["list", () => getList(req(""))],
    ["read", () => postRead(req("/read", "POST"))],
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
    expect(asMock(markNotificationsRead)).not.toHaveBeenCalled();
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
   * Info: (20260821 - Luphia) 搖鈴的條件必須是「計數**增加**」：
   * 拿「有沒有未讀」當條件會讓沒收掉的舊通知每分鐘搖一次鈴。
   */
  /**
   * Info: (20260825 - Julian) 這條原本是對元件原始碼做 `toMatch(/total > last/)`，
   * 而保留那行文字、把 `playChime()` 搬出 if 就能繞過它。
   *
   * 判斷已經搬進 `hasNewArrival`，行為由 `notification_sound.test.ts`
   * 真的測（首抓不算、持平不算、下降不算、上升才算）。這裡只剩接線：
   * 元件掛的是 `arrivalTick`，而它從 0 開始，所以首抓不會觸發。
   */
  it("搖動掛在 arrivalTick 上（首抓的 0 不觸發）", () => {
    const bell = codeOf("src", "components", "header", "notification_bell.tsx");

    expect(bell).toMatch(/arrivalTick === 0/);
    expect(bell).toMatch(/\[arrivalTick\]/);
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
  it.each([
    ["NOTIFICATION_TYPE_STYLE", "圖示與顏色的查表"],
    ["NOTIFICATION_LINK_PATH", "點下去的去處"],
    ["analysis_completed_named", "帶報告名稱的文案"],
    ["notification.unread", "未讀紅點的讀屏文字"],
  ])("消費端沒有自己一份 %s（%s）", (symbol) => {
    for (const consumer of [BELL, PAGE]) {
      expect(codeOf(...consumer)).not.toContain(symbol);
    }
    expect(codeOf(...ROW)).toContain(symbol);
  });

  /**
   * Info: (20260826 - Julian) 鈴鐺底部那句話必須有出口。
   *
   * 它原本是一句沒有任何操作的「還有更多未讀通知」——使用者看得到一個
   * 承諾，點不到對應的東西。而那句話在面板改成保留已讀之後連內容都不對了。
   */
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

  it.each([
    ["TODO_NOTIFICATION_TYPES", "待辦型清單"],
    ["canMarkReadByClick", "點了算不算已讀的判斷"],
  ])("消費端沒有自己一份 %s（%s）", (symbol) => {
    for (const consumer of [BELL, PAGE]) {
      expect(codeOf(...consumer)).not.toContain(symbol);
    }
  });

  it("鈴鐺底部有通往完整清單的連結", () => {
    expect(codeOf(...BELL)).toContain('href="/user/notifications"');
  });

  // Info: (20260826 - Julian) 頁面真的存在（上面那條連結不是指向 404）
  it("/user/notifications 頁面存在", () => {
    expect(codeOf(...PAGE)).toMatch(/export default function/);
  });
});
