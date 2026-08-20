/**
 * Info: (20260819 - Julian) 裝配測試：限流器與身分閘**真的被接上去了**（review B9）。
 *
 * ## 為什麼既有的 `attendance_rate_limit.test.ts` 擋不住
 *
 * 那一支讀 route 的**原始碼字串**，比對 `enforceRateLimit(` 出現在
 * `resolveEmployee(` 之前。它證明的是「那兩行的順序」，不是「限流真的會擋」。
 *
 * 具體的失效方式（checklist §1.7 逐字寫過這件事：「改的是那支函式，
 * 不是它有沒有被接上去」）：把任一支 route 的
 *
 * ```ts
 * const limited = enforceRateLimit(...);
 * if (limited) return limited;   // ← 只刪這一行
 * ```
 *
 * 刪掉第二行、留著第一行 —— 限流完全失效，而字串比對照樣全綠：
 * `enforceRateLimit(` 仍然在，位置也仍然在前面。
 *
 * ## 這一支怎麼補
 *
 * 直接 `import { POST } from "@/app/api/..."` 打真的 handler，**限流器與
 * validator 用真的**，只把 service 與 DeWT 驗證換成替身。斷言一律**成對**：
 *
 * 1. 回應是 429（使用者看得到的結果）
 * 2. service 的呼叫次數**沒有增加**（限流真的擋在業務之前）
 *
 * 少了第 2 條，一個「先做完事情再回 429」的實作會通過；
 * 少了第 1 條，一個「什麼都不做也不報錯」的實作會通過。
 * 兩條合起來才等於「擋住了」。
 *
 * ## 為什麼不 mock 限流器
 *
 * 被測的東西就是「它有沒有被接上」。把它換成替身，測的就變成替身有沒有被呼叫
 * —— 那正是上面那個 mutation 逃掉的地方。代價是這支測試依賴真的窗口設定，
 * 所以下面從 `RATE_LIMIT_RULES` 讀那個數字而不是寫死。
 *
 * ## 為什麼 `declare const jest`
 *
 * `next/jest`(SWC) 只提升**全域** `jest` 的 `jest.mock`。若 `jest` 是
 * `@jest/globals` 的 import 綁定，工廠不會被提升到 import 之前，於是 route
 * 已經抓走真的 service —— 症狀是 `mockReset is not a function`，
 * 而不是一個看得懂的錯誤。作法比照 `carbon_access.test.ts`。
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";

declare const jest: typeof JestType;

import { NextRequest } from "next/server";
import { RateLimitBucketEnum, RATE_LIMIT_RULES } from "@/constants/rate_limit";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { HTTP_MAP } from "@/lib/utils/status";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { leaveRequestService } from "@/services/leave_request.service";
import { overtimeRequestService } from "@/services/overtime_request.service";
import { POST as leaveSubmit } from "@/app/api/v1/user/account_book/[account_book_id]/hr/leave/request/route";
import { POST as overtimeSubmit } from "@/app/api/v1/user/account_book/[account_book_id]/hr/overtime/request/route";
import { POST as overtimeDeclareEmergency } from "@/app/api/v1/user/account_book/[account_book_id]/hr/overtime/request/[request_id]/emergency/route";

jest.mock("@/lib/auth/dewt", () => ({ getIdentityFromDeWT: jest.fn() }));
jest.mock("@/services/attendance_identity.service", () => ({
  attendanceIdentityService: { resolveEmployee: jest.fn() },
}));
jest.mock("@/services/leave_request.service", () => ({
  leaveRequestService: { submit: jest.fn() },
}));
jest.mock("@/services/overtime_request.service", () => ({
  overtimeRequestService: { submit: jest.fn(), declareEmergency: jest.fn() },
}));

const dewtMock = getIdentityFromDeWT as unknown as ReturnType<
  typeof jest.fn<(header: string | null) => Promise<{ address: string } | null>>
>;
const resolveEmployeeMock =
  attendanceIdentityService.resolveEmployee as unknown as ReturnType<
    typeof jest.fn<() => Promise<{ id: string }>>
  >;
const leaveSubmitMock = leaveRequestService.submit as unknown as ReturnType<
  typeof jest.fn<(params: { input: Record<string, unknown> }) => Promise<unknown>>
>;
const overtimeSubmitMock =
  overtimeRequestService.submit as unknown as ReturnType<
    typeof jest.fn<(params: { input: Record<string, unknown> }) => Promise<unknown>>
  >;
const declareEmergencyMock =
  overtimeRequestService.declareEmergency as unknown as ReturnType<
    typeof jest.fn<(params: Record<string, unknown>) => Promise<unknown>>
  >;

const BOOK = "book-1";
const MINUTE_MS = 60_000;

/**
 * Info: (20260819 - Julian) `IErrorDef.status` 是 `ApiCode`（`"RATE_LIMIT"`），
 * **不是** HTTP 數字 —— 那一層由 `jsonFail` 經 `HTTP_MAP` 轉出來。
 *
 * 第一版直接拿 `API_ERRORS.IS_RATE_LIMITED.status` 去比 `response.status`，
 * 於是拿 `"RATE_LIMIT"` 比 `429`。走 `HTTP_MAP` 而不是寫死 429：
 * 那張表就是 route 自己用的那一張，兩邊因此不可能分岔。
 */
const httpOf = (def: { status: keyof typeof HTTP_MAP }): number =>
  HTTP_MAP[def.status];

/** Info: (20260819 - Julian) 從設定讀，不寫死 —— 調參時這支不該跟著紅 */
const perMinuteLimit = (bucket: RateLimitBucketEnum): number => {
  const minute = (RATE_LIMIT_RULES[bucket] ?? []).find(
    (window) => window.windowMs === MINUTE_MS,
  );
  if (minute === undefined) {
    throw new Error(`${bucket} 沒有以分鐘為單位的窗口，這支測試的前提不成立`);
  }
  return minute.max;
};

const leaveBody = {
  leavePolicyId: "policy-annual",
  reason: "家中有事",
  // Info: (20260819 - Julian) 連續時段的「日期＋時刻」，逐日展開在 service
  startAt: "2026-08-20T08:00",
  endAt: "2026-08-20T17:00",
};

const overtimeBody = {
  workDate: "2026-08-20",
  filingType: "ADVANCE",
  compensationMode: "PAYMENT",
  requestedStartMinute: 1080,
  requestedEndMinute: 1200,
  reason: "趕工期",
};

const post = (body: unknown, address: string | null): NextRequest =>
  new NextRequest("http://localhost/api/v1/probe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(address === null ? {} : { Authorization: `Bearer ${address}` }),
    },
    body: JSON.stringify(body),
  });

const params = () => Promise.resolve({ account_book_id: BOOK });

beforeEach(() => {
  dewtMock.mockReset();
  resolveEmployeeMock.mockReset();
  leaveSubmitMock.mockReset();
  overtimeSubmitMock.mockReset();
  declareEmergencyMock.mockReset();

  dewtMock.mockImplementation(async (header) =>
    header === null ? null : { address: header.replace("Bearer ", "") },
  );
  resolveEmployeeMock.mockResolvedValue({ id: "emp-1" });
  leaveSubmitMock.mockResolvedValue({ id: "req-1" });
  overtimeSubmitMock.mockResolvedValue({ id: "ot-1" });
  declareEmergencyMock.mockResolvedValue({ id: "ot-1" });
});

describe("裝配：限流真的擋得住（不是只有那兩行的順序對）", () => {
  it.each([
    ["假單送出", "leave", leaveBody, () => leaveSubmitMock, leaveSubmit],
    ["加班單送出", "overtime", overtimeBody, () => overtimeSubmitMock, overtimeSubmit],
  ])(
    "%s：超限回 429，且 service 沒有被多呼叫一次",
    async (_label, slug, body, mockOf, handler) => {
      /**
       * Info: (20260819 - Julian) 每一條用自己的身分，計數才不會互相污染。
       *
       * 身分只能用 ASCII：它會被塞進 `Authorization` header，而 header 是
       * ByteString —— 中文字元會讓 `new NextRequest` 直接丟
       * 「character has a value greater than 255」。所以測試名稱用中文、
       * 身分另外給一個英文 slug，兩者不共用同一個字串。
       */
      const address = `0xprobe-${slug}`;
      const limit = perMinuteLimit(RateLimitBucketEnum.LEAVE_WRITE);

      for (let i = 0; i < limit; i += 1) {
        const response = await handler(post(body, address), {
          params: params(),
        });
        expect(response.status).toBe(200);
      }
      const callsBefore = mockOf().mock.calls.length;
      expect(callsBefore).toBe(limit);

      const blocked = await handler(post(body, address), { params: params() });

      // Info: (20260819 - Julian) ① 使用者看得到的結果
      expect(blocked.status).toBe(httpOf(API_ERRORS.IS_RATE_LIMITED));
      expect(blocked.headers.get("Retry-After")).not.toBeNull();

      /**
       * Info: (20260819 - Julian) ② 業務邏輯沒有被執行。
       *
       * **這一條才是那個 mutation 逃不掉的地方。** 刪掉
       * `if (limited) return limited;` 之後第 1 條會紅；而若有人改成
       * 「做完事再回 429」，只有這一條會紅。
       */
      expect(mockOf().mock.calls.length).toBe(callsBefore);
    },
  );

  /**
   * Info: (20260819 - Julian) 限流排在身分**之後**、業務**之前**。
   *
   * 排在身分之前的話，一個沒有 token 的人可以把別人的配額打光；
   * 排在業務之後的話，「失敗的嘗試也計入」不成立
   * （既有的字串比對測試想守的正是這一條，但守不住）。
   */
  it("沒有 Authorization 時回 401，且身分解析與 service 都沒被碰到", async () => {
    const response = await leaveSubmit(post(leaveBody, null), {
      params: params(),
    });

    expect(response.status).toBe(httpOf(API_ERRORS.AUTH_INVALID_TOKEN));
    expect(resolveEmployeeMock).not.toHaveBeenCalled();
    expect(leaveSubmitMock).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260819 - Julian) 一個人被擋下不影響另一個人。
   *
   * 限流以 `sessionUser.address` 分桶。若有人改成全域計數，上面那條照樣綠
   * （同一個身分本來就會被擋），而正式環境會變成「有人手速快，
   * 全公司都送不出假單」。
   */
  it("限流以身分分桶，不會殃及其他人", async () => {
    const noisy = "0xprobe-noisy";
    const quiet = "0xprobe-quiet";
    const limit = perMinuteLimit(RateLimitBucketEnum.LEAVE_WRITE);

    for (let i = 0; i <= limit; i += 1) {
      await leaveSubmit(post(leaveBody, noisy), { params: params() });
    }
    const blocked = await leaveSubmit(post(leaveBody, noisy), {
      params: params(),
    });
    expect(blocked.status).toBe(httpOf(API_ERRORS.IS_RATE_LIMITED));

    const other = await leaveSubmit(post(leaveBody, quiet), {
      params: params(),
    });
    expect(other.status).toBe(200);
  });
});

describe("裝配：validator 也真的接上了", () => {
  /**
   * Info: (20260819 - Julian) validator 同樣只有「有寫」沒有「有接上」的證據。
   * 倒序的區間必須在 400 就停住 —— 讓它進到 service，
   * `expandLeaveSpan` 會對著一段負長度的時間展開。
   */
  it("迄早於起時回 400，service 不被呼叫", async () => {
    const response = await leaveSubmit(
      post(
        { ...leaveBody, startAt: "2026-08-20T17:00", endAt: "2026-08-20T08:00" },
        "0xprobe-invalid",
      ),
      { params: params() },
    );
    expect(response.status).toBe(httpOf(API_ERRORS.VA_INVALID_INPUT_DATA));
    expect(leaveSubmitMock).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260819 - Julian) §32 IV 的認定**不得**由送出的 payload 帶進來
   * （review B7）。這一條把那個保證接到真的 route 上：多送一個
   * `isEmergency: true`，到達 service 的參數裡不能有它。
   *
   * zod 預設剝掉未宣告的鍵，所以驗的是「到不了 service」而不是「解析失敗」
   * —— 舊版前端或第三方腳本照舊送出那個欄位時，重要的是它沒有生效。
   */
  it("加班單多送 isEmergency 時，它到不了 service", async () => {
    const response = await overtimeSubmit(
      post({ ...overtimeBody, isEmergency: true }, "0xprobe-emergency"),
      { params: params() },
    );
    expect(response.status).toBe(200);
    expect(overtimeSubmitMock).toHaveBeenCalledTimes(1);

    const input = overtimeSubmitMock.mock.calls[0][0].input;
    expect("isEmergency" in input).toBe(false);
  });
});

/**
 * Info: (20260820 - Julian) §32 IV 認定的端點也要有裝配證據（review 第 2 條）。
 *
 * 這一支是 B7 的核心：它決定一張加班單會不會整段跳到加倍發給。
 * 而它先前**不在這個檔案裡**，也就是說「限流有沒有接上」「validator 有沒有
 * 接上」對它都沒有答案 —— 授權那一側由
 * `overtime_request_service.test.ts` 的 `declareEmergency` 那一組負責。
 */
describe("裝配：§32 IV 認定端點", () => {
  const declareParams = () =>
    Promise.resolve({ account_book_id: BOOK, request_id: "ot-1" });

  const body = {
    reportUrl: "https://example.test/filings/2026-0815-001",
    reportedAt: "2026-08-15T11:00:00+08:00",
  };

  it("超限回 429，且 service 沒有被多呼叫一次", async () => {
    const address = "0xprobe-emergency-rl";
    const limit = perMinuteLimit(RateLimitBucketEnum.LEAVE_WRITE);

    for (let i = 0; i < limit; i += 1) {
      const response = await overtimeDeclareEmergency(post(body, address), {
        params: declareParams(),
      });
      expect(response.status).toBe(200);
    }
    const callsBefore = declareEmergencyMock.mock.calls.length;

    const blocked = await overtimeDeclareEmergency(post(body, address), {
      params: declareParams(),
    });
    expect(blocked.status).toBe(httpOf(API_ERRORS.IS_RATE_LIMITED));
    expect(declareEmergencyMock.mock.calls.length).toBe(callsBefore);
  });

  /**
   * Info: (20260820 - Julian) 兩個欄位都必填 —— 缺一個就到不了 service。
   *
   * 「一個沒有記載的『已報備』等於沒有報備」是這條規則的全部，
   * 而它必須在 400 就停住：讓一個只有連結沒有時點的認定進到 service，
   * repository 的不變式才擋下來，那時使用者收到的是 500。
   */
  it.each([
    ["缺報備紀錄", { reportedAt: body.reportedAt }],
    ["缺報備時點", { reportUrl: body.reportUrl }],
    ["報備紀錄是空白", { ...body, reportUrl: "   " }],
  ])("%s：400，service 不被呼叫", async (label, payload) => {
    const response = await overtimeDeclareEmergency(
      post(payload, `0xprobe-em-${label.length}`),
      { params: declareParams() },
    );
    expect(response.status).toBe(httpOf(API_ERRORS.VA_INVALID_INPUT_DATA));
    expect(declareEmergencyMock).not.toHaveBeenCalled();
  });

  it("合法時把兩個欄位原樣交給 service", async () => {
    await overtimeDeclareEmergency(post(body, "0xprobe-em-ok"), {
      params: declareParams(),
    });
    expect(declareEmergencyMock).toHaveBeenCalledTimes(1);
    expect(declareEmergencyMock.mock.calls[0][0]).toMatchObject({
      accountBookId: BOOK,
      requestId: "ot-1",
      reportUrl: body.reportUrl,
      reportedAt: body.reportedAt,
    });
  });
});
