/**
 * Info: (20260831 - Julian) 裝配測試：薪資計算機的八支端點真的接上了身分閘、
 * 限流器與授權閘。
 *
 * 形式與理由完全照 `leave_route_wiring.test.ts`：直接 `import` 真的 handler，
 * **限流器與 validator 用真的**，只把 service 與 DeWT 驗證換成替身。
 * 限流的斷言一律成對（回 429 **且** service 沒有被多呼叫一次）——
 * 只斷言前者的話，「先做完事情再回 429」會通過；只斷言後者的話，
 * 「什麼都不做也不報錯」會通過。
 *
 * ## 這個模組特別要釘的兩條
 *
 * 1. **授權用 `assertSalaryAccountBookAccess`，而且它擋得住。**
 *    這個模組刻意不用 HR 那一套的 `resolveEmployee`（它在「這個帳本沒有你的
 *    員工檔」時回 404，會把老闆與會計全擋在門外）。代價是授權換了一道閘，
 *    而換閘最容易出的錯是「換了但忘了 await」——那樣的 route 永遠放行。
 *
 * 2. **租戶與操作者都只能來自不可偽造的來源。**
 *    `accountBookId` 來自路徑、`userId` 來自 DeWT。兩者若被 query／body 改寫，
 *    使用者就能替別的帳本寫入、或宣稱這筆紀錄是別人存的。
 *
 * `declare const jest` 的理由同 `leave_route_wiring.test.ts`：
 * `next/jest`(SWC) 只提升全域 `jest` 的 `jest.mock`。
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";

declare const jest: typeof JestType;

import { NextRequest } from "next/server";
import { RateLimitBucketEnum, RATE_LIMIT_RULES } from "@/constants/rate_limit";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { HTTP_MAP } from "@/lib/utils/status";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { defaultSalaryCalculatorResult } from "@/interfaces/salary_calculator";
import {
  assertSalaryAccountBookAccess,
  salaryRecordService,
} from "@/services/salary_record.service";
import {
  GET as employeeList,
  POST as employeeCreate,
} from "@/app/api/v1/user/account_book/[account_book_id]/salary_calculator/employee/route";
import {
  PUT as employeeUpdate,
  DELETE as employeeDelete,
} from "@/app/api/v1/user/account_book/[account_book_id]/salary_calculator/employee/[employee_id]/route";
import {
  GET as recordList,
  POST as recordSave,
} from "@/app/api/v1/user/account_book/[account_book_id]/salary_calculator/record/route";
import {
  GET as recordDetail,
  DELETE as recordDelete,
} from "@/app/api/v1/user/account_book/[account_book_id]/salary_calculator/record/[record_id]/route";

jest.mock("@/lib/auth/dewt", () => ({ getIdentityFromDeWT: jest.fn() }));
jest.mock("@/services/salary_record.service", () => ({
  assertSalaryAccountBookAccess: jest.fn(),
  salaryRecordService: {
    listEmployees: jest.fn(),
    createEmployee: jest.fn(),
    updateEmployee: jest.fn(),
    deleteEmployee: jest.fn(),
    listRecords: jest.fn(),
    getRecord: jest.fn(),
    saveRecord: jest.fn(),
    deleteRecord: jest.fn(),
  },
}));

type IAnyMock = ReturnType<
  typeof jest.fn<(...args: never[]) => Promise<unknown>>
>;

const dewtMock = getIdentityFromDeWT as unknown as ReturnType<
  typeof jest.fn<
    (header: string | null) => Promise<{ id: string; address: string } | null>
  >
>;
const guardMock = assertSalaryAccountBookAccess as unknown as IAnyMock;

const serviceMocks = {
  listEmployees: salaryRecordService.listEmployees as unknown as IAnyMock,
  createEmployee: salaryRecordService.createEmployee as unknown as IAnyMock,
  updateEmployee: salaryRecordService.updateEmployee as unknown as IAnyMock,
  deleteEmployee: salaryRecordService.deleteEmployee as unknown as IAnyMock,
  listRecords: salaryRecordService.listRecords as unknown as IAnyMock,
  getRecord: salaryRecordService.getRecord as unknown as IAnyMock,
  saveRecord: salaryRecordService.saveRecord as unknown as IAnyMock,
  deleteRecord: salaryRecordService.deleteRecord as unknown as IAnyMock,
};

const BOOK = "book-1";
const OTHER_BOOK = "book-evil";
const EMPLOYEE_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_EMPLOYEE_ID = "22222222-2222-4222-8222-222222222222";
const RECORD_ID = "33333333-3333-4333-8333-333333333333";
const MINUTE_MS = 60_000;

/**
 * Info: (20260831 - Julian) 身分。`USER_ID` 是 DeWT 解出來的，
 * `SPOOFED_USER_ID` 會出現在每一個 request body 裡 ——
 * 於是「`userId` 取自身分還是取自使用者送的資料」變成測得出來的問題。
 */
const USER_ID = "44444444-4444-4444-8444-444444444444";
const SPOOFED_USER_ID = "55555555-5555-4555-8555-555555555555";

// Info: (20260831 - Julian) IErrorDef.status 是 ApiCode 字串，HTTP 數字由 HTTP_MAP 轉
const httpOf = (def: { status: keyof typeof HTTP_MAP }): number =>
  HTTP_MAP[def.status];

// Info: (20260831 - Julian) 從設定讀，不寫死 —— 調參時這支不該跟著紅
const perMinuteLimit = (bucket: RateLimitBucketEnum): number => {
  const minute = (RATE_LIMIT_RULES[bucket] ?? []).find(
    (window) => window.windowMs === MINUTE_MS,
  );
  if (minute === undefined) {
    throw new Error(`${bucket} 沒有以分鐘為單位的窗口，這支測試的前提不成立`);
  }
  return minute.max;
};

const employeeBody = {
  name: "王小明",
  number: "A001",
  email: "ming@example.com",
  baseSalary: 30000,
  mealAllowance: 3000,
  // Info: (20260831 - Julian) 使用者送得出來、但不該被採信的東西
  userId: SPOOFED_USER_ID,
  accountBookId: OTHER_BOOK,
};

const recordBody = {
  employeeId: EMPLOYEE_ID,
  year: 2026,
  month: 8,
  input: {
    year: 2026,
    month: 8,
    baseSalaryTaxable: 30000,
    baseSalaryTaxFree: 3000,
  },
  result: defaultSalaryCalculatorResult,
  calculatorVersion: "2026.1",
  userId: SPOOFED_USER_ID,
  accountBookId: OTHER_BOOK,
};

const withAuth = (address: string | null): HeadersInit =>
  address === null
    ? { "Content-Type": "application/json" }
    : {
        "Content-Type": "application/json",
        Authorization: `Bearer ${address}`,
      };

const send = (
  method: string,
  body: unknown,
  address: string | null,
  url = "http://localhost/api/v1/probe",
): NextRequest =>
  new NextRequest(url, {
    method,
    headers: withAuth(address),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

const get = (address: string | null, query = ""): NextRequest =>
  send("GET", undefined, address, `http://localhost/api/v1/probe${query}`);

const bookParams = () => Promise.resolve({ account_book_id: BOOK });
const employeeParams = () =>
  Promise.resolve({ account_book_id: BOOK, employee_id: EMPLOYEE_ID });
const recordParams = () =>
  Promise.resolve({ account_book_id: BOOK, record_id: RECORD_ID });

beforeEach(() => {
  dewtMock.mockReset();
  guardMock.mockReset();
  dewtMock.mockImplementation(async (header) =>
    header === null
      ? null
      : { id: USER_ID, address: header.replace("Bearer ", "") },
  );
  guardMock.mockResolvedValue(undefined);

  for (const mock of Object.values(serviceMocks)) {
    mock.mockReset();
    mock.mockResolvedValue({ ok: true });
  }
});

describe("身分閘：沒有 token 就到不了業務邏輯", () => {
  it.each([
    ["員工清單", () => employeeList(get(null), { params: bookParams() })],
    [
      "新增員工",
      () =>
        employeeCreate(send("POST", employeeBody, null), {
          params: bookParams(),
        }),
    ],
    [
      "編輯員工",
      () =>
        employeeUpdate(send("PUT", employeeBody, null), {
          params: employeeParams(),
        }),
    ],
    [
      "刪除員工",
      () =>
        employeeDelete(send("DELETE", undefined, null), {
          params: employeeParams(),
        }),
    ],
    ["薪資紀錄清單", () => recordList(get(null), { params: bookParams() })],
    [
      "儲存薪資紀錄",
      () =>
        recordSave(send("POST", recordBody, null), { params: bookParams() }),
    ],
    ["薪資紀錄明細", () => recordDetail(get(null), { params: recordParams() })],
    [
      "刪除薪資紀錄",
      () =>
        recordDelete(send("DELETE", undefined, null), {
          params: recordParams(),
        }),
    ],
  ])("%s：回 401，且授權閘與 service 都沒被碰到", async (_label, run) => {
    const response = await run();

    expect(response.status).toBe(httpOf(API_ERRORS.AUTH_INVALID_TOKEN));
    expect(guardMock).not.toHaveBeenCalled();
    for (const mock of Object.values(serviceMocks)) {
      expect(mock).not.toHaveBeenCalled();
    }
  });
});

describe("授權閘：不是這本帳的成員就寫不進去", () => {
  it("閘丟 403 時 route 如實回 403，而且 service 沒有被呼叫", async () => {
    guardMock.mockRejectedValue(
      new AppError(API_ERRORS.AUTH_PERMISSION_DENIED),
    );

    const response = await recordSave(
      send("POST", recordBody, "0xguard-write"),
      { params: bookParams() },
    );

    expect(response.status).toBe(httpOf(API_ERRORS.AUTH_PERMISSION_DENIED));
    expect(serviceMocks.saveRecord).not.toHaveBeenCalled();
  });

  it("讀取路徑同樣過閘（唯讀不等於公開）", async () => {
    guardMock.mockRejectedValue(
      new AppError(API_ERRORS.AUTH_PERMISSION_DENIED),
    );

    const response = await recordList(get("0xguard-read"), {
      params: bookParams(),
    });

    expect(response.status).toBe(httpOf(API_ERRORS.AUTH_PERMISSION_DENIED));
    expect(serviceMocks.listRecords).not.toHaveBeenCalled();
  });

  it("八支端點每一支都呼叫過授權閘，而且帶的是路徑上的帳本", async () => {
    const calls: Promise<unknown>[] = [
      employeeList(get("0xall-1"), { params: bookParams() }),
      employeeCreate(send("POST", employeeBody, "0xall-2"), {
        params: bookParams(),
      }),
      employeeUpdate(send("PUT", employeeBody, "0xall-3"), {
        params: employeeParams(),
      }),
      employeeDelete(send("DELETE", undefined, "0xall-4"), {
        params: employeeParams(),
      }),
      recordList(get("0xall-5"), { params: bookParams() }),
      recordSave(send("POST", recordBody, "0xall-6"), { params: bookParams() }),
      recordDetail(get("0xall-7"), { params: recordParams() }),
      recordDelete(send("DELETE", undefined, "0xall-8"), {
        params: recordParams(),
      }),
    ];
    await Promise.all(calls);

    expect(guardMock).toHaveBeenCalledTimes(8);
    for (const call of guardMock.mock.calls) {
      expect(call[0]).toBe(BOOK);
      expect(call[1]).toBe(USER_ID);
    }
  });
});

describe("租戶與操作者只能來自不可偽造的來源", () => {
  it("儲存時的 userId 取自 DeWT，不是 request body", async () => {
    await recordSave(send("POST", recordBody, "0xspoof-user"), {
      params: bookParams(),
    });

    const [args] = serviceMocks.saveRecord.mock.calls;
    expect((args[0] as { userId: string }).userId).toBe(USER_ID);
    expect((args[0] as { userId: string }).userId).not.toBe(SPOOFED_USER_ID);
  });

  it("儲存時的 accountBookId 取自路徑，body 裡的同名欄位無效", async () => {
    await recordSave(send("POST", recordBody, "0xspoof-book"), {
      params: bookParams(),
    });

    const [args] = serviceMocks.saveRecord.mock.calls;
    expect((args[0] as { accountBookId: string }).accountBookId).toBe(BOOK);
  });

  it("列表的 accountBookId 取自路徑，query string 蓋不掉", async () => {
    await recordList(
      get(
        "0xspoof-query",
        `?accountBookId=${OTHER_BOOK}&employeeId=${OTHER_EMPLOYEE_ID}`,
      ),
      { params: bookParams() },
    );

    const [args] = serviceMocks.listRecords.mock.calls;
    const passed = args[0] as { accountBookId: string; employeeId?: string };
    expect(passed.accountBookId).toBe(BOOK);
    // Info: (20260831 - Julian) employeeId 是合法的篩選條件，它可以來自 query
    expect(passed.employeeId).toBe(OTHER_EMPLOYEE_ID);
  });
});

describe("驗證：形狀不對就進不了 service", () => {
  it("快照缺欄位時回 400（Json 欄位在 DB 端沒有守門人，這裡是唯一一道）", async () => {
    const broken = {
      ...recordBody,
      result: { totalPayment: 1 },
    };

    const response = await recordSave(send("POST", broken, "0xbad-shape"), {
      params: bookParams(),
    });

    expect(response.status).toBe(httpOf(API_ERRORS.VA_INVALID_INPUT_DATA));
    expect(serviceMocks.saveRecord).not.toHaveBeenCalled();
  });

  it("Email 格式不對時回 400", async () => {
    const response = await employeeCreate(
      send("POST", { ...employeeBody, email: "not-an-email" }, "0xbad-email"),
      { params: bookParams() },
    );

    expect(response.status).toBe(httpOf(API_ERRORS.VA_INVALID_INPUT_DATA));
    expect(serviceMocks.createEmployee).not.toHaveBeenCalled();
  });

  it("驗證失敗時連授權閘都不必打擾（順序：驗證在前）", async () => {
    await employeeCreate(send("POST", { name: "" }, "0xbad-order"), {
      params: bookParams(),
    });

    expect(guardMock).not.toHaveBeenCalled();
  });
});

describe("限流真的擋得住（不是只有那兩行的順序對）", () => {
  it("儲存薪資紀錄：超限回 429，且 service 沒有被多呼叫一次", async () => {
    const address = "0xrl-record-save";
    const limit = perMinuteLimit(RateLimitBucketEnum.SALARY_WRITE);

    for (let i = 0; i < limit; i += 1) {
      const response = await recordSave(send("POST", recordBody, address), {
        params: bookParams(),
      });
      expect(response.status).toBe(200);
    }
    const callsBefore = serviceMocks.saveRecord.mock.calls.length;
    expect(callsBefore).toBe(limit);

    const blocked = await recordSave(send("POST", recordBody, address), {
      params: bookParams(),
    });

    // Info: (20260831 - Julian) ① 使用者看得到的結果
    expect(blocked.status).toBe(httpOf(API_ERRORS.IS_RATE_LIMITED));
    expect(blocked.headers.get("Retry-After")).not.toBeNull();

    /**
     * Info: (20260831 - Julian) ② 業務邏輯沒有被執行。
     * 刪掉 route 的 `if (limited) return limited;` 之後只有 ① 會紅；
     * 改成「做完事再回 429」則只有 ② 會紅。兩條合起來才等於「擋住了」。
     */
    expect(serviceMocks.saveRecord.mock.calls.length).toBe(callsBefore);
  });

  it("新增員工用的是同一個寫入桶（不是各自為政）", async () => {
    const address = "0xrl-shared-bucket";
    const limit = perMinuteLimit(RateLimitBucketEnum.SALARY_WRITE);

    for (let i = 0; i < limit; i += 1) {
      await employeeCreate(send("POST", employeeBody, address), {
        params: bookParams(),
      });
    }

    // Info: (20260831 - Julian) 額度由新增員工用光，儲存紀錄同樣被擋 —— 兩支共用 SALARY_WRITE
    const blocked = await recordSave(send("POST", recordBody, address), {
      params: bookParams(),
    });

    expect(blocked.status).toBe(httpOf(API_ERRORS.IS_RATE_LIMITED));
    expect(serviceMocks.saveRecord).not.toHaveBeenCalled();
  });

  it("限流以身分分桶，不會殃及其他人", async () => {
    const noisy = "0xrl-noisy";
    const quiet = "0xrl-quiet";
    const limit = perMinuteLimit(RateLimitBucketEnum.SALARY_WRITE);

    for (let i = 0; i <= limit; i += 1) {
      await recordSave(send("POST", recordBody, noisy), {
        params: bookParams(),
      });
    }
    const blocked = await recordSave(send("POST", recordBody, noisy), {
      params: bookParams(),
    });
    expect(blocked.status).toBe(httpOf(API_ERRORS.IS_RATE_LIMITED));

    const other = await recordSave(send("POST", recordBody, quiet), {
      params: bookParams(),
    });
    expect(other.status).toBe(200);
  });

  it("讀取走 READ 桶，不吃寫入的額度", async () => {
    const address = "0xrl-read-vs-write";
    const writeLimit = perMinuteLimit(RateLimitBucketEnum.SALARY_WRITE);

    for (let i = 0; i <= writeLimit; i += 1) {
      await recordSave(send("POST", recordBody, address), {
        params: bookParams(),
      });
    }

    // Info: (20260831 - Julian) 寫入額度用光之後，讀取仍然要能用 —— 兩個桶是分開的
    const read = await recordList(get(address), { params: bookParams() });
    expect(read.status).toBe(200);
  });
});
