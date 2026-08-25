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
        "has_more_completed",
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
});
