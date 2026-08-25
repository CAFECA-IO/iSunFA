import path from "path";
import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
import { issueRecorderService } from "@/services/issue.recorder.service";
import { orderRepo } from "@/repositories/order.repo";
import { notifyAnalysisFailed } from "@/services/notification.service";
import { ORDER_STATUS } from "@/constants/status";

/**
 * Info: (20260825 - Julian) `jest` 必須是**全域**，不能 `import { jest }`。
 *
 * `jest.mock(...)` 由 next/jest 的 SWC transform 提升到所有 import 之上。
 * 把 `jest` 當成 import 進來的值，那些被提升的呼叫就會落在該 binding
 * 初始化之前 —— 而症狀不是報錯，是**替身安靜地沒有生效**：被測模組載入的是
 * 真的 repo，測試到 `mockResolvedValue` 那行才炸，錯誤訊息指向的是用法而不是成因。
 *
 * 同層的 `notification_service.test.ts` 用的是同一組宣告，照抄。
 */
declare const jest: typeof JestType;

/**
 * Info: (20260825 - Julian) 被放棄的任務要走到終態並通知（計畫書 D18）。
 *
 * ## 為什麼不用掃原始碼的方式測
 *
 * `notification_bell_wiring.test.ts` 用字串比對驗接線，那對「有沒有呼叫」
 * 夠用，但這一條要驗的是**條件**：只有真的放棄了才標失敗、已經失敗的不重發、
 * 還在跑的不能被誤判。字串比對答不出這三件事 —— 而它們正是這個修法會出錯的地方。
 *
 * ## 這一支測的是行為
 *
 * fs 與 repo 都換成替身，然後真的呼叫 `processNext()`，看它對訂單做了什麼。
 * 檔案系統的狀態（有沒有 `approved.*.md`、有沒有 `giveup.md`、有沒有
 * `recorded.flag`）由測試擺出來，這樣「哪一種檔案組合會導致什麼結果」
 * 才是被驗證的東西，而不是我在註解裡的宣稱。
 */

const ISSUE_DIR = "issues";
const MISSION_DIR = "missions";
const FOLDER = "0xmb_42";
const ORDER_ID = "order-1";
const USER_ID = "user-1";

const taskDir = path.join(process.cwd(), ISSUE_DIR, FOLDER);
const giveupPath = path.join(process.cwd(), MISSION_DIR, FOLDER, "giveup.md");
const flagPath = path.join(taskDir, "recorded.flag");
const contextPath = path.join(taskDir, "context.json");

/**
 * Info: (20260825 - Julian) 檔案系統的狀態表：測試擺，替身讀。
 * `existing` 決定 `fs.access` 成不成功，`contents` 決定 `fs.readFile` 讀到什麼。
 */
const fsState = {
  taskFiles: [] as string[],
  existing: new Set<string>(),
  contents: new Map<string, string>(),
  written: new Map<string, string>(),
};

jest.mock("fs/promises", () => ({
  readdir: jest.fn(
    async (target: string, options?: { withFileTypes?: true }) =>
      options?.withFileTypes
        ? [{ name: FOLDER, isDirectory: () => true }]
        : fsState.taskFiles,
  ),
  access: jest.fn(async (target: string) => {
    if (!fsState.existing.has(target)) {
      throw new Error(`ENOENT: ${target}`);
    }
  }),
  readFile: jest.fn(async (target: string) => {
    const content = fsState.contents.get(target);
    if (content === undefined) throw new Error(`ENOENT: ${target}`);
    return content;
  }),
  writeFile: jest.fn(async (target: string, content: string) => {
    fsState.written.set(target, content);
  }),
}));

jest.mock("@/services/env.service", () => ({
  getPriorityEnvConfig: jest.fn(async () => ({
    ISSUE_DIR,
    MISSION_DIR,
  })),
}));

jest.mock("@/repositories/order.repo", () => ({
  orderRepo: {
    findFirst: jest.fn(),
    findMany: jest.fn(async () => []),
    update: jest.fn(async () => ({})),
  },
}));

jest.mock("@/repositories/analysis.repo", () => ({
  analysisRepo: {
    findById: jest.fn(async () => null),
    findByOrderId: jest.fn(async () => null),
    findByOrderIdAndTaskId: jest.fn(async () => null),
    updateAnalysisResult: jest.fn(async () => ({})),
    syncAnalysisTags: jest.fn(async () => ({})),
  },
}));

jest.mock("@/services/notification.service", () => ({
  notifyAnalysisCompleted: jest.fn(async () => undefined),
  notifyAnalysisFailed: jest.fn(async () => undefined),
}));

jest.mock("@/skills/utils/document_parser_db_sync", () => ({
  syncDocumentResultToDatabase: jest.fn(async () => ({})),
}));

jest.mock("@/repositories/transaction.repo", () => ({
  TransactionRepo: class {},
}));

/**
 * Info: (20260825 - Julian) 被測模組與替身的 import 都放在檔首。
 *
 * `jest.mock(...)` 會被提升到所有 import 之上（next/jest 的 SWC transform），
 * 所以「先 import 再宣告 mock」的閱讀順序與實際執行順序無關 ——
 * 替身在被測模組載入之前就已經註冊好了。
 * 上面每個工廠回傳的都是箭頭函式，工廠執行當下不會去讀 `fsState`，
 * 因此它是 `const` 也不會踩到 TDZ。
 */
const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

function givenTask(options: {
  files?: string[];
  gaveUp?: boolean;
  alreadyRecorded?: boolean;
  orderStatus?: string;
}) {
  fsState.taskFiles = options.files ?? [];
  fsState.existing = new Set<string>();
  fsState.contents = new Map<string, string>();
  fsState.written = new Map<string, string>();

  if (options.gaveUp) fsState.existing.add(giveupPath);
  if (options.alreadyRecorded) fsState.existing.add(flagPath);
  fsState.contents.set(contextPath, JSON.stringify({ orderId: ORDER_ID }));

  asMock(orderRepo.findFirst).mockResolvedValue({
    id: ORDER_ID,
    userId: USER_ID,
    status: options.orderStatus ?? ORDER_STATUS.EXECUTING,
    mission: null,
    tokens: 0,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("IssueRecorder：被放棄的任務（D18）", () => {
  /**
   * Info: (20260825 - Julian) 核心：`giveup.md` 是一個終局，要寫進訂單狀態並通知。
   *
   * 斷言成對 —— 光驗「有發通知」不夠：訂單狀態如果沒被寫成 FAILED，
   * 使用者會收到一則「你的分析失敗了」，而畫面上那張訂單還在執行中。
   */
  it("被放棄時把訂單標成 FAILED 並通知使用者", async () => {
    givenTask({ gaveUp: true });

    await issueRecorderService.processNext();

    expect(asMock(orderRepo.update)).toHaveBeenCalledWith({
      where: { id: ORDER_ID },
      data: { status: ORDER_STATUS.FAILED },
    });
    expect(asMock(notifyAnalysisFailed)).toHaveBeenCalledTimes(1);
    expect(asMock(notifyAnalysisFailed)).toHaveBeenCalledWith({
      userId: USER_ID,
      orderId: ORDER_ID,
    });
    // Info: (20260825 - Julian) 要留下旗標，否則每一輪都會重做一次
    expect(fsState.written.has(flagPath)).toBe(true);
  });

  /**
   * Info: (20260825 - Julian) 反面：還在跑的任務不能被誤判成失敗。
   *
   * 少了這一條，「所有沒有 approved.*.md 的任務都標成失敗」會通過上一條 ——
   * 而那會把每一筆正在執行的分析都判死。
   */
  it("沒有 giveup.md 時什麼都不做", async () => {
    givenTask({ gaveUp: false });

    await issueRecorderService.processNext();

    expect(asMock(orderRepo.update)).not.toHaveBeenCalled();
    expect(asMock(notifyAnalysisFailed)).not.toHaveBeenCalled();
    expect(fsState.written.size).toBe(0);
  });

  // Info: (20260825 - Julian) 已經記錄過的不重掃（旗標的作用）
  it("已經有 recorded.flag 時不重複處理", async () => {
    givenTask({ gaveUp: true, alreadyRecorded: true });

    await issueRecorderService.processNext();

    expect(asMock(orderRepo.update)).not.toHaveBeenCalled();
    expect(asMock(notifyAnalysisFailed)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260825 - Julian) 訂單已經是 FAILED 就不重發。
   *
   * 真正保證「一張訂單只發一則」的是 `analysis-failed:<orderId>` 這把
   * 永久唯一鍵，這一層只是省掉注定撞鍵的往返 —— 但它也要真的生效，
   * 否則每一筆被放棄的任務都會多打一趟資料庫。
   */
  it("訂單已經是 FAILED 時不重發通知，但仍寫旗標", async () => {
    givenTask({ gaveUp: true, orderStatus: ORDER_STATUS.FAILED });

    await issueRecorderService.processNext();

    expect(asMock(orderRepo.update)).not.toHaveBeenCalled();
    expect(asMock(notifyAnalysisFailed)).not.toHaveBeenCalled();
    expect(fsState.written.has(flagPath)).toBe(true);
  });

  /**
   * Info: (20260825 - Julian) 找不到訂單就沒有收件人。
   *
   * 這是 §一.9 的塌陷值情境：「沒有訂單」與「通知失敗」在事後看起來一樣，
   * 所以旗標的內容要寫明原因，讓檔案系統上留得下線索。
   */
  it("找不到訂單時不通知，但留下寫明原因的旗標", async () => {
    givenTask({ gaveUp: true });
    asMock(orderRepo.findFirst).mockResolvedValue(null);

    await issueRecorderService.processNext();

    expect(asMock(notifyAnalysisFailed)).not.toHaveBeenCalled();
    expect(fsState.written.get(flagPath)).toMatch(/no matching order/i);
  });
});
