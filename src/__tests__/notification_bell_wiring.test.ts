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
  listNotifications: jest.fn(async () => ({ todos: [], completed: [] })),
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

  it.each([
    ["summary", () => getSummary(req("/summary"))],
    ["list", () => getList(req(""))],
    ["read", () => postRead(req("/read", "POST"))],
  ])("%s：未登入一律擋下", async (_label, call) => {
    asMock(getIdentityFromDeWT).mockResolvedValue(null);

    const response = await call();

    expect(response.status).not.toBe(200);
    expect(asMock(getNotificationSummary)).not.toHaveBeenCalled();
    expect(asMock(listNotifications)).not.toHaveBeenCalled();
    expect(asMock(markNotificationsRead)).not.toHaveBeenCalled();
  });
});

function codeOf(...segments: string[]): string {
  return readFileSync(join(process.cwd(), ...segments), "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !line.startsWith("*") && !line.startsWith("//"))
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

  it("header 真的掛上鈴鐺", () => {
    const header = codeOf("src", "components", "header", "user_actions.tsx");

    expect(header).toMatch(/<NotificationBell \/>/);
  });

  it("搖動動畫的 keyframes 存在", () => {
    const css = readFileSync(
      join(process.cwd(), "src", "app", "globals.css"),
      "utf8",
    );

    expect(css).toMatch(/@keyframes bell-shake/);
    expect(css).toMatch(/\.animate-bell-shake/);
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
      expect(dictionary).toMatch(/summary:/);
      expect(dictionary).toMatch(/wallet_upgrade:/);

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
  it("鈴鐺只在計數增加時搖動", () => {
    const bell = codeOf("src", "components", "header", "notification_bell.tsx");

    expect(bell).toMatch(/total > last/);
    expect(bell).toMatch(/last !== null/);
  });
});
