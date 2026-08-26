import path from "path";
import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
import { issueRecorderService } from "@/services/issue.recorder.service";
import { orderRepo } from "@/repositories/order.repo";
import {
  notifyAnalysisCompleted,
  notifyAnalysisFailed,
} from "@/services/notification.service";
import { analysisRepo } from "@/repositories/analysis.repo";
import { ANALYSIS_CATEGORY } from "@/constants/analysis";
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
// Info: (20260826 - Julian) 已核可的結果走的是「成功」那條路（非 giveup）
const APPROVED_FILE = "approved.1.md";
const resultPath = path.join(taskDir, "1.md");

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

/**
 * Info: (20260826 - Julian) 同一份工作不得同時通知「完成」與「失敗」（review B2）。
 *
 * ## 缺陷長什麼樣
 *
 * 完成通知原本緊接在 `updateAnalysisResult` 之後**無條件**發出，而它後面
 * 那段 DB 同步失敗時會把訂單寫成 FAILED，於是再發一則失敗通知。
 * CERTIFICATE_ANALYSIS 的結果少了 `dbSyncPayload` 就會走到這裡 ——
 * 使用者對同一份工作同時收到兩則互相矛盾的通知，而兩則的 `dedupeKey`
 * 都是永久唯一鍵，收不回也蓋不掉。
 *
 * ## 為什麼既有測試看不到
 *
 * 這個檔案把 `notification.service` 換成替身是對的（checklist §1.2 允許，
 * 而 `notification_service.test.ts` 直接測那一支）。看不到的原因不是替身，
 * 是**沒有任何案例走過 DB 同步失敗那條路** —— 上面五條全都是 giveup 路徑。
 * 替身早就準備好回答「有沒有發完成通知」，只是從來沒有人問。
 */
describe("IssueRecorder：完成與失敗不得同時發出（B2）", () => {
  const ANALYSIS = {
    id: "analysis-1",
    userId: USER_ID,
    orderId: ORDER_ID,
    type: "certificate_analysis",
  };

  /**
   * Info: (20260826 - Julian) 擺出一個「跑完了，但結果裡沒有 dbSyncPayload」的任務。
   *
   * `category` 是 CERTIFICATE_ANALYSIS 才會觸發那道守門 —— 其他類別缺
   * `dbSyncPayload` 是正常的，不算失敗。
   */
  const givenApprovedTask = (options: { category?: string } = {}) => {
    fsState.taskFiles = [APPROVED_FILE];
    fsState.existing = new Set<string>();
    fsState.contents = new Map<string, string>();
    fsState.written = new Map<string, string>();

    fsState.contents.set(
      contextPath,
      JSON.stringify({ orderId: ORDER_ID, analysisId: ANALYSIS.id }),
    );
    // Info: (20260826 - Julian) 有結果、但**沒有** dbSyncPayload
    fsState.contents.set(resultPath, JSON.stringify({ summary: "done" }));

    asMock(orderRepo.findFirst).mockResolvedValue({
      id: ORDER_ID,
      userId: USER_ID,
      status: ORDER_STATUS.EXECUTING,
      mission: null,
      tokens: 0,
      data: {
        category: options.category ?? ANALYSIS_CATEGORY.CERTIFICATE_ANALYSIS,
      },
    });
    asMock(analysisRepo.findById).mockResolvedValue(ANALYSIS);
  };

  /**
   * Info: (20260826 - Julian) 核心斷言，而且**成對**。
   *
   * 只驗「沒發完成通知」會被一個「什麼都沒發」的實作騙過去；
   * 只驗「發了失敗通知」則是缺陷發生時本來就成立的那一半。
   */
  it("DB 同步失敗時只發失敗通知，不發完成通知", async () => {
    givenApprovedTask();

    await issueRecorderService.processNext();

    expect(asMock(notifyAnalysisCompleted)).not.toHaveBeenCalled();
    expect(asMock(notifyAnalysisFailed)).toHaveBeenCalledTimes(1);
  });

  // Info: (20260826 - Julian) 訂單也要真的被寫成 FAILED（通知與狀態不能分岔）
  it("DB 同步失敗時訂單寫成 FAILED", async () => {
    givenApprovedTask();

    await issueRecorderService.processNext();

    expect(asMock(orderRepo.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: ORDER_STATUS.FAILED }),
      }),
    );
  });

  /**
   * Info: (20260826 - Julian) 反面：同步沒失敗時完成通知照發。
   *
   * 少了這條，「把完成通知整個刪掉」也會讓上面兩條全綠 —— 而那是
   * 這次修法最容易不小心做到的事（條件寫錯就等於永遠不發）。
   */
  it("同步沒有失敗時照常發出完成通知，且不發失敗通知", async () => {
    givenApprovedTask({ category: "other_analysis" });

    await issueRecorderService.processNext();

    expect(asMock(notifyAnalysisCompleted)).toHaveBeenCalledTimes(1);
    expect(asMock(notifyAnalysisCompleted)).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        analysisId: ANALYSIS.id,
        analysisType: ANALYSIS.type,
      }),
    );
    expect(asMock(notifyAnalysisFailed)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260826 - Julian) 結果仍然要寫進 analysis，即使不通知。
   *
   * 修法只該改「說不說」，不該改「存不存」—— 使用者被告知失敗之後，
   * 那份跑出來的結果仍然是他付過錢的東西。
   */
  it("同步失敗仍然寫入分析結果（只是不通知完成）", async () => {
    givenApprovedTask();

    await issueRecorderService.processNext();

    expect(asMock(analysisRepo.updateAnalysisResult)).toHaveBeenCalledTimes(1);
  });
});

/**
 * Info: (20260826 - Julian) 終態不得被自動流程覆寫（review：決定論）。
 *
 * 兩處守門原本都寫成「不是 FAILED 就寫成 FAILED」，那擋得住重複標記，
 * 擋不住**覆寫**。而覆寫的後果不是多一則通知：
 *
 * - 已 `COMPLETED` 的多任務訂單被改回 FAILED → 使用者收到「你的分析失敗了」，
 *   而他手上已經有跑完的報告
 * - 已 `CANCEL` 的訂單被改成 FAILED → 系統把使用者的決定推翻
 *
 * 放棄路徑那份是從成功路徑複製過去的，所以兩處都要有案例 ——
 * 只測一處的話，下一次複製又會把缺陷帶到第三處。
 */
describe("IssueRecorder：終態不覆寫", () => {
  it.each([
    ORDER_STATUS.COMPLETED,
    ORDER_STATUS.CANCEL,
    ORDER_STATUS.MINT_FAILED,
    ORDER_STATUS.PAYMENT_FAILED,
  ])("放棄路徑：訂單已是 %s 時不改狀態也不通知", async (status) => {
    givenTask({ gaveUp: true, orderStatus: status });

    await issueRecorderService.processNext();

    expect(asMock(orderRepo.update)).not.toHaveBeenCalled();
    expect(asMock(notifyAnalysisFailed)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260826 - Julian) 反面：在途狀態仍然要被寫成 FAILED。
   *
   * 少了這條，「把守門寫成永遠 return」也會讓上面全綠 —— 而那等於
   * D18 整個復活（放棄的任務永遠不進終態、使用者什麼都收不到）。
   */
  it("放棄路徑：在途狀態仍然標成 FAILED 並通知", async () => {
    givenTask({ gaveUp: true, orderStatus: ORDER_STATUS.EXECUTING });

    await issueRecorderService.processNext();

    expect(asMock(orderRepo.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: ORDER_STATUS.FAILED }),
      }),
    );
    expect(asMock(notifyAnalysisFailed)).toHaveBeenCalledTimes(1);
  });

  /**
   * Info: (20260826 - Julian) 仍然寫旗標（否則每一輪都重掃這筆，答案永遠一樣）。
   *
   * 這一條把「不動訂單」與「不處理這筆」分開 —— 前者是這次要的，
   * 後者會讓 recorder 每輪都白跑一次資料庫查詢。
   */
  it("放棄路徑：終態訂單仍然寫下旗標", async () => {
    givenTask({ gaveUp: true, orderStatus: ORDER_STATUS.COMPLETED });

    await issueRecorderService.processNext();

    expect(fsState.written.has(flagPath)).toBe(true);
  });
});
