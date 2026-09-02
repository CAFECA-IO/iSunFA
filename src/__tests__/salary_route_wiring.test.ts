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
import { readdirSync, readFileSync } from "fs";
import { join, sep } from "path";
import type { jest as JestType } from "@jest/globals";

declare const jest: typeof JestType;

import { NextRequest } from "next/server";
import { RateLimitBucketEnum, RATE_LIMIT_RULES } from "@/constants/rate_limit";
import { SalaryAccess } from "@/constants/salary_access";
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

/**
 * Info: (20260831 - Julian) 參數寫 `unknown[]` 而不是 `never[]`。
 *
 * `never[]` 會讓 jest-mock 30.5 起的 `ResolveType<T> = ReturnType<T> extends
 * PromiseLike<infer U> ? U : never` 整條塌成 `never`，於是 `mockResolvedValue`
 * 只收得下 `never` —— 症狀是本機（30.4）綠、CI（`npm i` 抓到 30.5）紅。
 * 這些 mock 都是 `as unknown as` 轉進來的，呼叫端不靠這個型別，用 `unknown[]` 沒有損失。
 */
type IAnyMock = ReturnType<
  typeof jest.fn<(...args: unknown[]) => Promise<unknown>>
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

/**
 * Info: (20260901 - Julian) 八支端點的清單，三個 `it.each` 共用同一份。
 *
 * ## 為什麼要有這張表
 *
 * 上一版的三個 describe 各自手寫案例，結果是：401 走完八支，
 * 「授權閘擋得住」只驗了 2 支，限流只驗了 1 支。檔頭卻宣稱守著八支。
 * 實測：把 `employee/route.ts` 兩處 `if (limited) return limited;` 全部註解掉
 * → `npx jest salary_route_wiring` → **23 passed，一條都沒紅**；
 * 把 `POST employee` 的 `await assertSalaryAccountBookAccess(...)` 改成
 * `void ...`（忘了 await ＝ 永遠放行）→ 同樣全綠 ——
 * 而「換閘忘了 await」正是這個檔頭第 16 行自己寫下要防的缺陷。
 *
 * 涵蓋範圍變成一張表之後，新增端點時漏掉的成本是「表裡少一列」，
 * 而下面「表涵蓋了每一支被匯入的 handler」那條會把它抓出來。
 *
 * `bucket` 與 `service` 必須與 route 實際使用的一致 —— 填錯會讓限流那條
 * 用錯的額度去灌，症狀是灌不滿而測試變成在測別的東西，所以下面另有一條
 * 「READ 與 SALARY_WRITE 的額度不同」把兩者的前提釘住。
 */
interface IEndpointCase {
  label: string;
  /**
   * Info: (20260901 - Julian) 純 ASCII 的識別字，用來組限流測試的 `Authorization` 值。
   * 不能拿 `label` 來組：它含中文，而 header 值要能轉成 ByteString
   * （字碼 > 255 會直接丟 `TypeError`，而且是在建 request 時炸，不是在斷言時）。
   */
  key: string;
  /**
   * Info: (20260901 - Julian) 這支 handler 在 API 目錄裡的位置，格式 `METHOD 相對路徑`。
   * 下面「端點表涵蓋 API 目錄底下每一支 handler」那條靠它與走訪結果對拍。
   */
  source: string;
  bucket: RateLimitBucketEnum;
  /**
   * Info: (20260901 - Julian) 這支端點該向授權閘要求的層級。
   * 讀寫填反了就等於把寫入放寬給 `VIEWER`，而那是 §4.3
   * 「拼錯的方向通常是放寬」最典型的一格 —— 所以它要有斷言。
   */
  access: SalaryAccess;
  /**
   * Info: (20260901 - Julian) 有 request body 的端點才有這一支：送一個形狀不對的 body。
   *
   * 沒有 body 的端點（GET / DELETE）留 `undefined`，下面的 `it.each` 會濾掉。
   * 這一格存在的理由是 `PUT employee/:id` 先前完全沒有驗證測試 ——
   * 把它的 `if (!parsed.success) return jsonFail(...)` 改成 `return jsonOk(null)`
   * （通得過型別、驗證失敗回 200）→ 55 passed 全綠。
   */
  runInvalid?: (address: string) => Promise<Response>;
  service: IAnyMock;
  run: (address: string | null) => Promise<Response>;
}

/**
 * Info: (20260901 - Julian) API 目錄的走訪，用來確認上面那張表沒有短少。
 *
 * `expect(ENDPOINTS).toHaveLength(8)` 只擋得住「表變短」，擋不住「目錄變長」——
 * 掃描根等於剛好被修的那幾個檔案（checklist §1.1）。實測：新增第九支
 * `salary_calculator/employee/bulk/route.ts`（無 DeWT、無限流、無授權閘）
 * → 56 passed 全綠，而 `app_route_auth_guard.test.ts` 幫不上忙
 * （`api` 在它的 `PUBLIC_ROOTS` 裡）。
 *
 * 同一輪已把 `salary_provider_scope.test.ts` 從寫死清單改成目錄走訪 ——
 * 前端做了，API 側沒做。這裡補上，做法照抄。
 */
const API_DIR = join(
  process.cwd(),
  "src",
  "app",
  "api",
  "v1",
  "user",
  "account_book",
  "[account_book_id]",
  "salary_calculator",
);

// Info: (20260901 - Julian) App Router 的 handler 一律是具名 export，方法名就是 HTTP 動詞
const HANDLER_RE = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g;

/**
 * Info: (20260901 - Julian) 去掉註解再掃。
 * 註解裡引用 `export async function GET` 當例子是正常寫法，
 * 而被註解掉的 handler 不該被當成一支還活著的端點（同 `salary_provider_scope` 的作法）。
 */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/[^\n]*/gm, "");

const collectHandlers = (): string[] =>
  readdirSync(API_DIR, { recursive: true, encoding: "utf-8" })
    .map((entry) => entry.split(sep).join("/"))
    .filter((entry) => entry.endsWith("route.ts"))
    .flatMap((relativePath) => {
      const source = stripComments(
        readFileSync(join(API_DIR, relativePath), "utf8"),
      );
      return [...source.matchAll(HANDLER_RE)].map(
        (match) => `${match[1]} ${relativePath}`,
      );
    })
    .sort();

const ENDPOINTS: IEndpointCase[] = [
  {
    label: "GET employee（員工清單）",
    key: "employee-list",
    source: "GET employee/route.ts",
    access: SalaryAccess.READ,
    bucket: RateLimitBucketEnum.READ,
    service: serviceMocks.listEmployees,
    run: (address) => employeeList(get(address), { params: bookParams() }),
  },
  {
    label: "POST employee（新增員工）",
    key: "employee-create",
    source: "POST employee/route.ts",
    access: SalaryAccess.WRITE,
    bucket: RateLimitBucketEnum.SALARY_WRITE,
    service: serviceMocks.createEmployee,
    run: (address) =>
      employeeCreate(send("POST", employeeBody, address), {
        params: bookParams(),
      }),
    runInvalid: (address) =>
      employeeCreate(send("POST", { name: "" }, address), {
        params: bookParams(),
      }),
  },
  {
    label: "PUT employee/:id（編輯員工）",
    key: "employee-update",
    source: "PUT employee/[employee_id]/route.ts",
    access: SalaryAccess.WRITE,
    bucket: RateLimitBucketEnum.SALARY_WRITE,
    service: serviceMocks.updateEmployee,
    run: (address) =>
      employeeUpdate(send("PUT", employeeBody, address), {
        params: employeeParams(),
      }),
    runInvalid: (address) =>
      employeeUpdate(send("PUT", { name: "" }, address), {
        params: employeeParams(),
      }),
  },
  {
    label: "DELETE employee/:id（移除員工）",
    key: "employee-delete",
    source: "DELETE employee/[employee_id]/route.ts",
    access: SalaryAccess.WRITE,
    bucket: RateLimitBucketEnum.SALARY_WRITE,
    service: serviceMocks.deleteEmployee,
    run: (address) =>
      employeeDelete(send("DELETE", undefined, address), {
        params: employeeParams(),
      }),
  },
  {
    label: "GET record（薪資紀錄清單）",
    key: "record-list",
    source: "GET record/route.ts",
    access: SalaryAccess.READ,
    bucket: RateLimitBucketEnum.READ,
    service: serviceMocks.listRecords,
    run: (address) => recordList(get(address), { params: bookParams() }),
  },
  {
    label: "POST record（儲存薪資紀錄）",
    key: "record-save",
    source: "POST record/route.ts",
    access: SalaryAccess.WRITE,
    bucket: RateLimitBucketEnum.SALARY_WRITE,
    service: serviceMocks.saveRecord,
    run: (address) =>
      recordSave(send("POST", recordBody, address), { params: bookParams() }),
    runInvalid: (address) =>
      recordSave(
        send("POST", { ...recordBody, result: { totalPayment: 1 } }, address),
        { params: bookParams() },
      ),
  },
  {
    label: "GET record/:id（薪資紀錄明細）",
    key: "record-detail",
    source: "GET record/[record_id]/route.ts",
    access: SalaryAccess.READ,
    bucket: RateLimitBucketEnum.READ,
    service: serviceMocks.getRecord,
    run: (address) => recordDetail(get(address), { params: recordParams() }),
  },
  {
    label: "DELETE record/:id（刪除薪資紀錄）",
    key: "record-delete",
    source: "DELETE record/[record_id]/route.ts",
    access: SalaryAccess.WRITE,
    bucket: RateLimitBucketEnum.SALARY_WRITE,
    service: serviceMocks.deleteRecord,
    run: (address) =>
      recordDelete(send("DELETE", undefined, address), {
        params: recordParams(),
      }),
  },
];

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
  it("端點表涵蓋了全部八支端點（表短了，下面三條就會靜靜地少驗幾支）", () => {
    expect(ENDPOINTS).toHaveLength(8);
    expect(new Set(ENDPOINTS.map((endpoint) => endpoint.label)).size).toBe(8);
    expect(new Set(ENDPOINTS.map((endpoint) => endpoint.key)).size).toBe(8);
    expect(new Set(ENDPOINTS.map((endpoint) => endpoint.service)).size).toBe(8);
  });

  /**
   * Info: (20260901 - Julian) 表與**目錄**對拍，不是與一個寫死的數字對拍。
   *
   * 上一條只問「表有沒有變短」。這一條問「目錄有沒有變長」——
   * 新增一支 route 而沒登記進表裡，這裡會紅並直接指出是哪一支，
   * 而不是讓它靜靜地待在 API 底下不受任何裝配測試檢查。
   */
  it("端點表涵蓋 API 目錄底下每一支 handler（新增 route 沒登記就會紅）", () => {
    const handlers = collectHandlers();

    // Info: (20260901 - Julian) 走訪撈到空氣的話，下面那條會變成兩個空陣列相等
    expect(handlers.length).toBeGreaterThan(0);
    expect(handlers).toEqual(
      ENDPOINTS.map((endpoint) => endpoint.source).sort(),
    );
  });

  it.each(ENDPOINTS)(
    "$label：回 401，且授權閘與 service 都沒被碰到",
    async ({ run }) => {
      const response = await run(null);

      expect(response.status).toBe(httpOf(API_ERRORS.AUTH_INVALID_TOKEN));
      expect(guardMock).not.toHaveBeenCalled();
      for (const mock of Object.values(serviceMocks)) {
        expect(mock).not.toHaveBeenCalled();
      }
    },
  );
});

describe("授權閘：不是這本帳的成員就寫不進去", () => {
  /**
   * Info: (20260901 - Julian) 八支全走一遍，而且斷言成對。
   *
   * 只斷言「回 403」的話，`void assertSalaryAccountBookAccess(...)`
   * （忘了 await）不會紅 —— 未被 await 的 rejection 不影響回傳值，
   * route 照樣把 service 的結果回出去；只斷言「service 沒被呼叫」的話，
   * 「閘擋下來但回錯狀態碼」也不會紅。兩條合起來才等於「這道閘接上了」。
   *
   * 讀取路徑也在表裡 —— 唯讀不等於公開，薪資讀取尤其不是。
   */
  it.each(ENDPOINTS)(
    "$label：閘丟 403 時如實回 403，且 service 沒有被呼叫",
    async ({ run, service }) => {
      guardMock.mockRejectedValue(
        new AppError(API_ERRORS.AUTH_PERMISSION_DENIED),
      );

      const response = await run("0xguard-blocked");

      expect(response.status).toBe(httpOf(API_ERRORS.AUTH_PERMISSION_DENIED));
      expect(service).not.toHaveBeenCalled();
    },
  );

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

  /**
   * Info: (20260901 - Julian) 每一支要求的層級都與它實際做的事相符。
   *
   * 上面那條只證明「閘被呼叫過」，不管它被要求了什麼。少了這一條，
   * 把 `DELETE record/:id` 填成 `SalaryAccess.READ` 不會有任何紅燈 ——
   * 而那正好等於「唯讀成員可以硬刪薪資紀錄」，也就是這次要修掉的缺陷本身。
   *
   * 逐支分開跑而不是一次八支併發：`guardMock.mock.calls` 的順序在
   * `Promise.all` 之下不保證與陣列順序相同，比對就會比錯格。
   */
  it.each(ENDPOINTS)(
    "$label：向授權閘要求的層級正確（讀是讀、寫是寫）",
    async ({ run, access }) => {
      await run("0xaccess-level");

      expect(guardMock).toHaveBeenCalledTimes(1);
      expect(guardMock.mock.calls[0][2]).toBe(access);
    },
  );

  it("寫入端點就是那五支（三讀五寫，換一種分法都要有人重新想過）", () => {
    const writes = ENDPOINTS.filter(
      (endpoint) => endpoint.access === SalaryAccess.WRITE,
    ).map((endpoint) => endpoint.key);

    expect(writes).toEqual([
      "employee-create",
      "employee-update",
      "employee-delete",
      "record-save",
      "record-delete",
    ]);
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

  it("缺少員工編號時回 400 —— 編號是帳本內的身分鍵，不能靠後端撿", async () => {
    const { number, ...withoutNumber } = employeeBody;
    expect(number).toBe("A001");

    const response = await employeeCreate(
      send("POST", withoutNumber, "0xno-number"),
      { params: bookParams() },
    );

    expect(response.status).toBe(httpOf(API_ERRORS.VA_INVALID_INPUT_DATA));
    expect(serviceMocks.createEmployee).not.toHaveBeenCalled();
  });

  it("沒有 Email 也建得起來 —— 它只在寄薪資單時要用", async () => {
    const { email, ...withoutEmail } = employeeBody;
    expect(email).toBe("ming@example.com");

    const response = await employeeCreate(
      send("POST", withoutEmail, "0xno-email"),
      { params: bookParams() },
    );

    expect(response.status).toBe(200);
    expect(serviceMocks.createEmployee).toHaveBeenCalledTimes(1);
  });

  it("Email 格式不對時回 400", async () => {
    const response = await employeeCreate(
      send("POST", { ...employeeBody, email: "not-an-email" }, "0xbad-email"),
      { params: bookParams() },
    );

    expect(response.status).toBe(httpOf(API_ERRORS.VA_INVALID_INPUT_DATA));
    expect(serviceMocks.createEmployee).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260901 - Julian) 三支帶 body 的端點都要擋得住形狀不對的輸入。
   *
   * 上面那幾條手寫案例只涵蓋 `POST record` 與 `POST employee`，
   * `PUT employee/:id` 一條都沒有 —— 而它是唯一一支「改既有資料」的端點。
   * 斷言成對：回 400 **且** service 沒被呼叫。只驗前者的話，
   * 「先寫進去再回 400」會通過；只驗後者的話，「驗證失敗卻回 200」會通過
   * （那正是這一條實測到的假綠形狀）。
   */
  it.each(ENDPOINTS.filter((endpoint) => endpoint.runInvalid !== undefined))(
    "$label：body 形狀不對時回 400，且 service 沒有被呼叫",
    async ({ runInvalid, service }) => {
      const response = await runInvalid!("0xbad-body");

      expect(response.status).toBe(httpOf(API_ERRORS.VA_INVALID_INPUT_DATA));
      expect(service).not.toHaveBeenCalled();
    },
  );

  it("帶 body 的端點就是那三支（少一支代表有人把驗證拿掉了）", () => {
    expect(
      ENDPOINTS.filter((endpoint) => endpoint.runInvalid !== undefined).map(
        (endpoint) => endpoint.key,
      ),
    ).toEqual(["employee-create", "employee-update", "record-save"]);
  });

  it("驗證失敗時連授權閘都不必打擾（順序：驗證在前）", async () => {
    await employeeCreate(send("POST", { name: "" }, "0xbad-order"), {
      params: bookParams(),
    });

    expect(guardMock).not.toHaveBeenCalled();
  });
});

describe("限流真的擋得住（不是只有那兩行的順序對）", () => {
  /**
   * Info: (20260901 - Julian) 八支端點各自灌滿自己的桶，斷言成對。
   *
   * 上一版只有 `POST record` 這一支。實測：把 `employee/route.ts` 兩處
   * `if (limited) return limited;` 註解掉 → 全套 23 條一條都沒紅。
   * 換句話說，八支裡有七支的限流接線沒有任何東西守著。
   *
   * **每一支用不同的 `address`**：限流器以身分分桶，共用同一個位址的話
   * 前一支灌滿會直接把後一支擋掉，那時候測到的是「桶是共用的」，
   * 不是「這一支自己接上了限流」（checklist §1.9：
   * 選到的觀測量要能區分成功與失敗）。
   *
   * 兩條斷言的分工：
   * ① 使用者看得到的結果 —— 429 且帶 `Retry-After`。
   *    刪掉 `if (limited) return limited;` 只有這條會紅。
   * ② 業務邏輯沒有被執行 —— service 的呼叫次數沒有再增加。
   *    改成「做完事再回 429」只有這條會紅。
   */
  it.each(ENDPOINTS)(
    "$label：超限回 429，且 service 沒有被多呼叫一次",
    async ({ run, bucket, service, key }) => {
      const address = `0xrl-${key}`;
      const limit = perMinuteLimit(bucket);

      for (let i = 0; i < limit; i += 1) {
        const response = await run(address);
        expect(response.status).toBe(200);
      }

      const callsBefore = service.mock.calls.length;
      expect(callsBefore).toBe(limit);

      const blocked = await run(address);

      // Info: (20260901 - Julian) ① 使用者看得到的結果
      expect(blocked.status).toBe(httpOf(API_ERRORS.IS_RATE_LIMITED));
      expect(blocked.headers.get("Retry-After")).not.toBeNull();

      // Info: (20260901 - Julian) ② 業務邏輯沒有被執行
      expect(service.mock.calls.length).toBe(callsBefore);
    },
  );

  /**
   * Info: (20260901 - Julian) 上面那條的前提：兩個桶的額度必須不同。
   *
   * 若 `READ` 與 `SALARY_WRITE` 的每分鐘上限碰巧相同，端點表裡的 `bucket`
   * 填錯也灌得滿、測試照樣綠 —— 那時候上面驗到的就不是它宣稱的那件事。
   * 這一條在額度被調成一樣時會紅，提醒改用別的方式區分。
   */
  it("READ 與 SALARY_WRITE 的每分鐘額度不同（上面那條靠這個區分桶填錯）", () => {
    expect(perMinuteLimit(RateLimitBucketEnum.READ)).not.toBe(
      perMinuteLimit(RateLimitBucketEnum.SALARY_WRITE),
    );
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
