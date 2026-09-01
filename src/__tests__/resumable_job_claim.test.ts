import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { readFileSync } from "fs";
import { join } from "path";

import { claimJobForChannel } from "@/services/resumable_job.service";
import {
  JOB_CLAIM,
  ResumableJobOwnershipError,
  resumableJobRepo,
} from "@/repositories/resumable_job.repo";
import {
  JOB_CLAIM_DENIAL,
  JOB_CLAIM_INTENT,
  JOB_CLAIM_TTL_MS,
  JOB_STATUS,
  JOB_TYPE,
} from "@/constants/resumable_job";
import { buildCarbonChatChannel } from "@/constants/carbon_chatbot";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { ApiError as RequestApiError } from "@/lib/utils/request";
import {
  isJobBusyError,
  resolveJobClaimDenial,
} from "@/hooks/use_carbon_chat.helpers";

/**
 * Info: (20260827 - Luphia) 執行許可（issue #6721）。
 *
 * 要防的事很具體：同一個帳號開兩個分頁（很常見——第一個看起來卡住了才開第二個），
 * 補點數之後兩邊都跳出「可以繼續」，兩邊都按下去 → 同一批份送兩次 →
 * **點數扣兩次**。一份 2MB 的 PDF 單次預扣估算約 677 點。
 *
 * 這一組分兩層測，因為兩層各自守著不同的事：
 *
 * - Service：四種結果對應四種處置。壓成一句「失敗」的話，畫面只能說一句放之
 *   四海的錯誤訊息，而使用者的下一步在四種情況下完全不同。
 * - Repo：裁決必須寫在 `updateMany` 的 `where` 裡。先讀後寫之間有窗口，
 *   而這把鎖的全部意義就是關掉那個窗口。
 */

jest.mock("@/repositories/resumable_job.repo", () => {
  class OwnershipError extends Error {}
  return {
    JOB_CLAIM: {
      CLAIMED: "CLAIMED",
      BUSY: "BUSY",
      COMPLETED: "COMPLETED",
      CANCELLED: "CANCELLED",
      NO_JOB: "NO_JOB",
    },
    ResumableJobOwnershipError: OwnershipError,
    resumableJobRepo: { claimIfIdle: jest.fn() },
  };
});

jest.mock("@/repositories/chatroom.repo", () => ({
  chatroomRepo: { findAccountBookIdByChannel: jest.fn(async () => null) },
}));

jest.mock("@/repositories/faith_billing_setting.repo", () => ({
  faithBillingSettingRepo: { resolveSetting: jest.fn() },
}));

jest.mock("@/services/carbon_billing.service", () => ({
  resolveBillingTeamId: jest.fn(async () => "team-1"),
}));

jest.mock("@/lib/utils/logger", () => ({
  logger: {
    child: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
  },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const OWNER_ADDRESS = "0xaaaa000000000000000000000000000000000001";
const OTHER_ADDRESS = "0xbbbb000000000000000000000000000000000002";
const NOW_MS = 1_787_000_000_000;
const CHANNEL = buildCarbonChatChannel(OWNER_ADDRESS, "default");

const jobRow = (over: Record<string, unknown> = {}) => ({
  id: "job-1",
  userId: "user-1",
  teamId: "team-1",
  type: JOB_TYPE.CARBON_REPORT_IMPORT,
  status: JOB_STATUS.PAUSED,
  resourceKey: CHANNEL,
  pauseReason: null,
  pausedAt: null,
  totalSteps: 14,
  completedSteps: 5,
  failedSteps: 0,
  remainingStepIds: ["ch6-1"],
  nextStepCost: "677",
  lastError: null,
  createdAt: new Date(NOW_MS),
  updatedAt: new Date(NOW_MS),
  ...over,
});

/**
 * Info: (20260827 - Luphia) `address` **不給預設值**：JS 傳 `undefined` 給有預設值
 * 的參數會套用預設值，於是「沒有位址」那條測試實際上送的是擁有者的位址——
 * 它會綠，而它守的那道防線一行都沒被執行過。這個坑第一次寫就踩到了。
 */
const claim = (params: {
  intent: (typeof JOB_CLAIM_INTENT)[keyof typeof JOB_CLAIM_INTENT];
  address?: string;
}) =>
  claimJobForChannel({
    userId: "user-1",
    address: "address" in params ? params.address : OWNER_ADDRESS,
    type: JOB_TYPE.CARBON_REPORT_IMPORT,
    resourceKey: CHANNEL,
    intent: params.intent,
    nowMs: NOW_MS,
  });

describe("執行許可：四種結果對應四種處置", () => {
  beforeEach(() => {
    asMock(resumableJobRepo.claimIfIdle).mockReset();
  });

  it("拿到許可時回傳任務檢視", async () => {
    asMock(resumableJobRepo.claimIfIdle).mockResolvedValue({
      kind: JOB_CLAIM.CLAIMED,
      job: jobRow({ status: JOB_STATUS.RUNNING }),
    });
    const view = await claim({ intent: JOB_CLAIM_INTENT.RESUME });
    expect(view).not.toBeNull();
    expect(view?.status).toBe(JOB_STATUS.RUNNING);
    expect(view?.remainingStepIds).toEqual(["ch6-1"]);
  });

  /**
   * Info: (20260827 - Luphia) 別人正在跑：**兩種意圖都要擋**。這是這把鎖唯一
   * 真正在做的事，其餘分支只是把「為什麼不行」講清楚。
   *
   * 新開也要擋的理由：兩個分頁各自從第一份開始匯入同一個聊天室，兩份帳都要付。
   */
  it.each([JOB_CLAIM_INTENT.RESUME, JOB_CLAIM_INTENT.START])(
    "另一個地方正在跑時擋下（intent=%s）",
    async (intent) => {
      asMock(resumableJobRepo.claimIfIdle).mockResolvedValue({
        kind: JOB_CLAIM.BUSY,
        job: jobRow({ status: JOB_STATUS.RUNNING }),
        heldUntil: new Date(NOW_MS + JOB_CLAIM_TTL_MS),
      });
      await expect(claim({ intent })).rejects.toMatchObject({
        code: API_ERRORS.TW_JOB_ALREADY_RUNNING.code,
      });
    },
  );

  it("接續時找不到任務是錯，新開時不是", async () => {
    asMock(resumableJobRepo.claimIfIdle).mockResolvedValue({
      kind: JOB_CLAIM.NO_JOB,
    });
    await expect(
      claim({ intent: JOB_CLAIM_INTENT.RESUME }),
    ).rejects.toMatchObject({
      code: API_ERRORS.TW_JOB_NOT_FOUND.code,
    });
    await expect(claim({ intent: JOB_CLAIM_INTENT.START })).resolves.toBeNull();
  });

  /**
   * Info: (20260828 - Luphia) **取消過的任務不可以被搶去跑**（review #6726 高-1）。
   *
   * 缺陷的四段鏈條：分頁 A 按「不做了」→ 分頁 B（早就開著、沒重新整理）那顆
   * 「接著匯入」還在 → 按下去 → 許可放行 → 那批份真的跑、點數真的扣
   *（一份 2MB 的 PDF 單次預扣估算約 677 點）。**使用者明確說不要做的事被做了。**
   *
   * 這一條特別要緊，因為 `cancel/route.ts` 的註解自己寫著「畫面上那顆『接著匯入』
   * 會一直邀請他去花錢」——而取消之後它在另一個分頁裡仍然邀請得到。
   * 那是一句描述了未達成保證的註解（檢查表 §1.14）。
   */
  it("取消過的任務：接續是錯，新開時不是", async () => {
    asMock(resumableJobRepo.claimIfIdle).mockResolvedValue({
      kind: JOB_CLAIM.CANCELLED,
      job: jobRow({ status: JOB_STATUS.CANCELLED }),
    });
    await expect(
      claim({ intent: JOB_CLAIM_INTENT.RESUME }),
    ).rejects.toMatchObject({ code: API_ERRORS.TW_JOB_CANCELLED.code });
    await expect(claim({ intent: JOB_CLAIM_INTENT.START })).resolves.toBeNull();
  });

  /**
   * Info: (20260828 - Luphia) 「已取消」與「已完成」用不同的錯誤碼：兩者的
   * 下一步不同——已完成是「沒有東西可做了」，已取消是「你自己說不做的」，
   * 而後者若顯示成前者，使用者會以為系統把它跑完了。
   */
  it("「已取消」與「已完成」不是同一個錯誤碼", () => {
    expect(API_ERRORS.TW_JOB_CANCELLED.code).not.toBe(
      API_ERRORS.TW_JOB_ALREADY_COMPLETED.code,
    );
  });

  it("接續已完成的任務是錯，新開時不是（重新匯入會覆寫舊書籤）", async () => {
    asMock(resumableJobRepo.claimIfIdle).mockResolvedValue({
      kind: JOB_CLAIM.COMPLETED,
      job: jobRow({ status: JOB_STATUS.COMPLETED }),
    });
    await expect(
      claim({ intent: JOB_CLAIM_INTENT.RESUME }),
    ).rejects.toMatchObject({
      code: API_ERRORS.TW_JOB_ALREADY_COMPLETED.code,
    });
    await expect(claim({ intent: JOB_CLAIM_INTENT.START })).resolves.toBeNull();
  });

  /**
   * Info: (20260827 - Luphia) 「已完成」與「有人正在跑」要用不同的錯誤碼：
   * 前者要收起按鈕，後者要留著按鈕請他等一下。混成同一個碼的話，
   * 畫面在其中一種情況下必定做錯事。
   */
  it("「已完成」與「正在跑」不是同一個錯誤碼", () => {
    expect(API_ERRORS.TW_JOB_ALREADY_RUNNING.code).not.toBe(
      API_ERRORS.TW_JOB_ALREADY_COMPLETED.code,
    );
  });
});

describe("執行許可的兩道所有權防線", () => {
  beforeEach(() => {
    asMock(resumableJobRepo.claimIfIdle).mockReset();
  });

  /**
   * Info: (20260827 - Luphia) 第一道在 Service，而且要在**任何查詢之前**。
   * 碳盤查的頻道是可推導的（`carbon-chat-{位址}-{sessionId}`，位址是鏈上公開
   * 資訊），少了它任何登入者都能對別人的任務下手。
   */
  it("頻道不是自己的：拒絕，且一次查詢都不發", async () => {
    await expect(
      claim({ intent: JOB_CLAIM_INTENT.RESUME, address: OTHER_ADDRESS }),
    ).rejects.toMatchObject({
      code: API_ERRORS.AUTH_PERMISSION_DENIED.code,
    });
    expect(asMock(resumableJobRepo.claimIfIdle)).not.toHaveBeenCalled();
  });

  it("沒有位址：拒絕", async () => {
    await expect(
      claim({ intent: JOB_CLAIM_INTENT.RESUME, address: undefined }),
    ).rejects.toMatchObject({
      code: API_ERRORS.AUTH_PERMISSION_DENIED.code,
    });
    expect(asMock(resumableJobRepo.claimIfIdle)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260827 - Luphia) 第二道在 Repo（那一列的 userId）。兩道回答的是
   * 兩件不同的事：「這個頻道是不是你的」與「這一列任務是不是你的」。
   * 底層錯誤不可以原樣噴到前端（CLAUDE.md §6），轉成 403。
   */
  it("那一列屬於別人：Repo 的錯誤轉成 403，不噴原始錯誤", async () => {
    asMock(resumableJobRepo.claimIfIdle).mockRejectedValue(
      new ResumableJobOwnershipError(CHANNEL, JOB_TYPE.CARBON_REPORT_IMPORT),
    );
    await expect(
      claim({ intent: JOB_CLAIM_INTENT.RESUME }),
    ).rejects.toMatchObject({
      code: API_ERRORS.AUTH_PERMISSION_DENIED.code,
    });
  });
});

/**
 * Info: (20260827 - Luphia) 租約的機制（issue #6721）。
 *
 * 租約不需要新欄位：`status === RUNNING` 加上 `updatedAt` 的新鮮度就是租約，
 * 而檢查點（issue #6723）每做完一份就寫一次書籤，天然就是續租的心跳。
 *
 * 這一組直接讀 Repo 的原始碼，因為要守的是**條件寫在哪裡**——那是一個
 * 行為測試很難分辨、而寫錯就完全失效的性質（先讀後判斷的版本在單執行緒的
 * 測試裡與正確版本表現一模一樣）。
 */
describe("租約的實作性質", () => {
  const repoSource = readFileSync(
    join(process.cwd(), "src", "repositories", "resumable_job.repo.ts"),
    "utf8",
  );

  const claimScope = (() => {
    const start = repoSource.indexOf("async claimIfIdle(");
    expect(start).toBeGreaterThan(-1);
    const end = repoSource.indexOf("async setStatus(", start);
    expect(end).toBeGreaterThan(start);
    return repoSource.slice(start, end);
  })();

  /**
   * Info: (20260827 - Luphia) 裁決必須在 `updateMany` 的 `where` 裡。
   * 先讀後寫之間有窗口，而這把鎖的全部意義就是關掉那個窗口——
   * 「先 findUnique 判斷再 update」在測試裡會全綠，在兩個分頁同時按下去時會失效。
   */
  it("裁決寫在條件更新裡，不是先讀再判斷", () => {
    expect(claimScope).toContain("updateMany(");
    const updateAt = claimScope.indexOf("updateMany(");
    const whereScope = claimScope.slice(updateAt);
    expect(whereScope).toContain("status: { not: JOB_STATUS.RUNNING }");
    expect(whereScope).toContain("updatedAt: { lt: staleBefore }");
    expect(whereScope).toContain("OR: [");
  });

  /**
   * Info: (20260828 - Luphia) 已完成**與已取消**的列都不可以被搶去跑
   *（review #6726 高-1）。
   *
   * 狀態集合只有五個（RUNNING / PAUSED / RESUMABLE / COMPLETED / CANCELLED），
   * 所以排除這兩個之後這個判斷就**完備**了——不會再有第三個「不該被搶」的
   * 狀態漏掉。這一條同時釘住那個完備性。
   */
  it("條件排除已完成與已取消", () => {
    const whereScope = claimScope.slice(claimScope.indexOf("updateMany("));
    expect(whereScope).toContain("JOB_STATUS.COMPLETED");
    expect(whereScope).toContain("JOB_STATUS.CANCELLED");
    expect(whereScope).toContain("notIn:");
  });

  /**
   * Info: (20260827 - Luphia) 搶到之後要清掉暫停原因與暫停時間。
   * 留著的話，一個正在跑的任務會同時帶著「因為點數用完而暫停」——
   * 而掃描行程與畫面都會相信那個欄位。
   */
  it("搶到之後清掉暫停原因與暫停時間", () => {
    const dataScope = claimScope.slice(claimScope.indexOf("data: {"));
    expect(dataScope).toContain("status: JOB_STATUS.RUNNING");
    expect(dataScope).toContain("pauseReason: null");
    expect(dataScope).toContain("pausedAt: null");
  });

  /**
   * Info: (20260827 - Luphia) 租期一定要會過期。分頁被強制關掉、瀏覽器當掉、
   * 電腦睡著時沒有任何人會來釋放——永久鎖住的症狀是「按了沒反應」，
   * 那是最難自救的一種失敗。
   */
  it("租期大於單一份的最長耗時，且是有限值", () => {
    expect(JOB_CLAIM_TTL_MS).toBeGreaterThan(60 * 1000);
    expect(Number.isFinite(JOB_CLAIM_TTL_MS)).toBe(true);
  });
});

/**
 * Info: (20260827 - Luphia) 客戶端真的去拿了那把鎖（issue #6721）。
 *
 * 一把沒有人拿的鎖是裝飾品，而那種缺陷在伺服器端測試裡是**全綠**的
 * ——13 條 service/repo 測試不會有任何一條紅。檢查表 §1.11／§1.14。
 */
describe("兩個入口都會先拿許可", () => {
  const hook = readFileSync(
    join(process.cwd(), "src", "hooks", "use_carbon_chat.ts"),
    "utf8",
  );

  it("新開匯入：在附件上傳之前就拿許可", () => {
    const claimAt = hook.indexOf("claimImportJob(JOB_CLAIM_INTENT.START)");
    expect(claimAt).toBeGreaterThan(-1);
    /**
     * Info: (20260827 - Luphia) 擋下來的時候一個 byte 都不該傳、一毛都不該花。
     * 上傳在許可之後的話，被擋下的那次已經付了附件上傳的代價。
     */
    const uploadAt = hook.indexOf("先把檔案存進 Laria 拿 cid");
    expect(uploadAt).toBeGreaterThan(claimAt);
  });

  /**
   * Info: (20260827 - Luphia) 接續是這把鎖最要緊的入口：`isRetryingImport`
   * 只擋得住同一個分頁，而暫停之後「開第二個分頁」正是使用者最常做的事。
   */
  it("接續：在送出任何一份之前拿許可", () => {
    const start = hook.indexOf(
      "const resumePausedImportChapters = useCallback",
    );
    expect(start).toBeGreaterThan(-1);
    const end = hook.indexOf("const toggleImportItem = useCallback", start);
    const scope = hook.slice(start, end);
    const claimAt = scope.indexOf("claimImportJob(JOB_CLAIM_INTENT.RESUME)");
    expect(claimAt).toBeGreaterThan(-1);
    const runAt = scope.indexOf("await runImportChapters(");
    expect(runAt).toBeGreaterThan(claimAt);
  });

  it.each([
    "claimImportJob(JOB_CLAIM_INTENT.START)",
    "claimImportJob(JOB_CLAIM_INTENT.RESUME)",
  ])("被擋下時逐判決說話而不是「匯入失敗」（%s）", (call) => {
    const at = hook.indexOf(call);
    expect(at).toBeGreaterThan(-1);
    const scope = hook.slice(at, at + 700);
    /**
     * Info: (20260901 - Luphia) 文案走判決查表（review #6726 阻-1）：
     * 一句 `import_job_busy` 蓋在三種判決上，會讓「已取消」顯示成
     * 「有人在跑」——使用者對著錯的原因等待。
     */
    expect(scope).toContain("JOB_CLAIM_DENIAL_TEXT_KEY[");
    expect(scope).not.toContain("carbon_chatbot.import_failed");
  });

  /**
   * Info: (20260901 - Luphia) 判斷本體是**純函式**（review #6726 阻-1 與同份
   * review 的「觀察」）：`resolveJobClaimDenial` 直接以真的 ApiError 實例測，
   * 不 mock；掃描只降級為「hook 真的呼叫了它」（下一條）。
   *
   * 舊版 catch 把 `TW_JOB_CANCELLED`／`TW_JOB_ALREADY_COMPLETED`／403 全部
   * 當成「鎖自己壞掉」放行——伺服器明確說「不要跑」的判決被吞掉，剩下那幾份
   * 照送、點數照扣。BroadcastChannel 不可用、或舊分頁開在另一台裝置上時，
   * 沒有任何一道擋得住。
   */
  describe("判決的純函式：四種擋、其餘放行", () => {
    const apiError = (errorCode: string, status: number) =>
      new RequestApiError("denied", status, { errorCode });

    it.each([
      [API_ERRORS.TW_JOB_ALREADY_RUNNING.code, 409, JOB_CLAIM_DENIAL.BUSY],
      [API_ERRORS.TW_JOB_CANCELLED.code, 400, JOB_CLAIM_DENIAL.CANCELLED],
      [
        API_ERRORS.TW_JOB_ALREADY_COMPLETED.code,
        400,
        JOB_CLAIM_DENIAL.COMPLETED,
      ],
      [API_ERRORS.AUTH_PERMISSION_DENIED.code, 403, JOB_CLAIM_DENIAL.FORBIDDEN],
    ])("錯誤碼 %s（HTTP %i）→ 有判決", (code, status, denial) => {
      expect(
        resolveJobClaimDenial(apiError(code as string, status as number)),
      ).toBe(denial);
    });

    it("網路錯誤（不是 ApiError）→ null（放行）", () => {
      expect(resolveJobClaimDenial(new Error("fetch failed"))).toBeNull();
    });

    it("伺服器自己壞掉（500、無錯誤碼）→ null（放行）", () => {
      expect(
        resolveJobClaimDenial(new RequestApiError("boom", 500)),
      ).toBeNull();
    });

    it("認不得的錯誤碼 → null（放行：新判決要先教會 resolver）", () => {
      expect(resolveJobClaimDenial(apiError("TW999999", 400))).toBeNull();
    });

    // Info: (20260901 - Luphia) isJobBusyError 是同一份判準的投影，不得分岔
    it("isJobBusyError 建立在同一份判準上", () => {
      expect(
        isJobBusyError(apiError(API_ERRORS.TW_JOB_ALREADY_RUNNING.code, 409)),
      ).toBe(true);
      expect(
        isJobBusyError(apiError(API_ERRORS.TW_JOB_CANCELLED.code, 400)),
      ).toBe(false);
    });
  });

  /**
   * Info: (20260901 - Luphia) 掃描降級為接線：判斷已收斂進純函式（上一組直接
   * 測它），這裡只守「hook 真的把 catch 交給那支函式，而且只對 null 放行」。
   */
  it("claimImportJob 的 catch 交給 resolveJobClaimDenial，只對 null 放行", () => {
    const start = hook.indexOf("const claimImportJob = useCallback");
    expect(start).toBeGreaterThan(-1);
    const end = hook.indexOf("const [importJob, setImportJob]", start);
    const scope = hook.slice(start, end);
    expect(scope).toContain("const denial = resolveJobClaimDenial(error);");
    expect(scope).toContain("if (denial) return denial;");
    // Info: (20260901 - Luphia) fail-open 只剩一條：resolver 回 null（網路／伺服器壞掉）
    expect(scope).not.toContain("return true;");
  });

  /**
   * Info: (20260901 - Luphia) 終局判決要讓卡片改口（review #6726 阻-1）：
   * BUSY 以外的判決代表伺服器眼中的狀態已經與按鈕分岔了。
   */
  it("接續被終局判決擋下時會刷新伺服器狀態", () => {
    const at = hook.indexOf("claimImportJob(JOB_CLAIM_INTENT.RESUME)");
    expect(at).toBeGreaterThan(-1);
    const scope = hook.slice(at, at + 900);
    expect(scope).toContain(
      "if (resumeDenial !== JOB_CLAIM_DENIAL.BUSY) void refreshImportJob();",
    );
  });

  it.each(["zh_tw", "zh_cn", "en", "ja", "ko"])(
    "%s 有四種判決的文案",
    (locale) => {
      const file = readFileSync(
        join(
          process.cwd(),
          "src",
          "i18n",
          "locales",
          locale,
          "carbon_chatbot.ts",
        ),
        "utf8",
      );
      expect(file).toContain("import_job_busy:");
      // Info: (20260901 - Luphia) 三個終局判決各說各的話（review #6726 阻-1）
      expect(file).toContain("import_job_cancelled:");
      expect(file).toContain("import_job_completed_already:");
      expect(file).toContain("import_job_forbidden:");
      // Info: (20260901 - Luphia) busy 的等待時間綁 TTL 常數，不寫死（中-2）
      expect(file).toContain("{{minutes}}");
    },
  );
});
