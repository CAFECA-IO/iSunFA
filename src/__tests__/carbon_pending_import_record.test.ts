import { describe, it, expect } from "@jest/globals";
import { buildPendingImportRecord } from "@/lib/carbon_pending_import_record";
import { CarbonPendingImportDataSchema } from "@/validators/carbon_pending_import";
import type { IPendingImport } from "@/components/carbon_chatbot/import_preview";

/**
 * Info: (20260828 - Julian) 存出去的待匯入紀錄**不得漏掉斷點**（實測發現，見
 * `resumable_job_resume_landing_and_copy.md` §6.2）。
 *
 * 這一檔的由來是一個沉默的資料遺失：`persistPendingImport` 逐欄位手寫存檔的
 * 形狀，而 #6713 加的 `pausedChapters` / `pausedUnits` / `pauseReason`
 * 沒有被加進那個字面量。三件事讓它沒有被任何人發現：
 *
 * 1. schema 把那三個欄位定義成**選填**（為了讓舊紀錄還存得進去），驗證照樣過；
 * 2. 記憶體裡的物件帶著它們，所以**當下**的畫面完全正常；
 * 3. 還原端是 `...restored.pending`，看起來也完全正常。
 *
 * 症狀只在重載之後出現 —— 而重載正是這件事唯一的使用情境（通知在幾分鐘
 * 或幾天後才響）。使用者看到的是一張有檔名、沒有內容、沒有「接著匯入」的卡片。
 */

const CHAPTER = { id: "ch-5", title: "第五章 範疇二排放" };

const DETAIL = {
  resetAt: 1_760_000_000_000,
  options: ["TOP_UP", "WAIT_RESET"],
  exceedsWindowLimit: false,
};

const UNIT = {
  chapterId: "ch-5",
  sectionIds: ["s-1", "s-2"],
  partIndex: 1,
  partTotal: 2,
};

function pendingOf(overrides: Partial<IPendingImport> = {}): IPendingImport {
  return {
    fileName: "報告書.pdf",
    originSessionId: "sess-1",
    originSessionTitle: "新的盤查對話",
    items: [
      {
        paragraphId: "p-1",
        title: "1.1 公司簡介",
        content: "內容",
        hasExisting: false,
        checked: true,
      },
    ],
    unmapped: ["找不到對應段落的一段話"],
    activityCount: 0,
    failedChapters: [],
    ...overrides,
  };
}

const build = (pending: IPendingImport) =>
  buildPendingImportRecord({
    pending,
    source: {
      cid: "cid-1",
      fileName: "報告書.pdf",
      mimeType: "application/pdf",
      // Info: (20260828 - Julian) 重載之後就是這個形狀：只剩 cid，File 已經不在
      file: null,
    },
    activities: [],
    pageIndex: new Map([["ch-5", 12]]),
    savedAt: "2026-08-28T00:00:00.000Z",
  });

describe("斷點要存得下去", () => {
  const paused = pendingOf({
    items: [],
    pausedChapters: [CHAPTER],
    pausedUnits: [UNIT],
    pauseReason: "CREDITS_EXHAUSTED",
  });

  it("三個斷點欄位都寫進紀錄", () => {
    expect(build(paused).pending).toEqual(
      expect.objectContaining({
        pausedChapters: [CHAPTER],
        pausedUnits: [UNIT],
        pauseReason: "CREDITS_EXHAUSTED",
      }),
    );
  });

  /**
   * Info: (20260828 - Julian) 走一趟 schema —— 因為真正的路徑會經過它。
   *
   * 只斷言「物件裡有那三個鍵」擋不住一種很像的錯：欄位存在但形狀不合，
   * 於是 `safeParse` 在還原端整筆丟掉，症狀與漏存一模一樣。
   */
  it("通過 schema，且解析回來之後斷點還在", () => {
    const parsed = CarbonPendingImportDataSchema.safeParse(build(paused));

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.pending.pausedChapters).toEqual([
      CHAPTER,
    ]);
    expect(parsed.success && parsed.data.pending.pausedUnits).toEqual([UNIT]);
  });

  /**
   * Info: (20260828 - Julian) 沒有暫停時是 `undefined`，**不是空陣列**。
   *
   * 補成 `[]` 會把「這份匯入沒有暫停過」與「暫停過但我忘了存」寫成同一個值，
   * 而還原端分不出來 —— 那正是這一檔要防的那種靜默。
   */
  it("沒有暫停時不留下空陣列", () => {
    const record = build(pendingOf());

    expect(record.pending.pausedChapters).toBeUndefined();
    expect(record.pending.pausedUnits).toBeUndefined();
    expect(record.pending.pauseReason).toBeNull();
  });
});

/**
 * Info: (20260828 - Julian) 下一個被漏掉的欄位要在這裡紅。
 *
 * 上面三條釘的是**這一次**漏掉的那三個。真正會重演的是手法：
 * schema 加一個選填欄位、存檔的字面量忘了跟上，而選填讓驗證閉嘴。
 *
 * 所以這一條由 **schema 自己**長出來：凡是 schema 認得的 `pending` 欄位，
 * 只要輸入有值，建出來的紀錄就必須帶著它。加欄位的人不必記得回來加測試。
 */
describe("schema 認得的欄位，一個都不能漏", () => {
  it("輸入有值的欄位全部出現在紀錄裡", () => {
    const full = pendingOf({
      pausedChapters: [CHAPTER],
      pausedUnits: [UNIT],
      pauseReason: "PAYMENT_REQUIRED",
      pauseDetail: DETAIL,
      // Info: (20260903 - Luphia) #6743 加的第三個「逐欄位手寫」欄位(open/69)
      inventoryYear: 2024,
    });
    const record = build(full);

    const schemaKeys = Object.keys(
      CarbonPendingImportDataSchema.shape.pending.shape,
    );
    const carried = schemaKeys.filter(
      (key) => (record.pending as Record<string, unknown>)[key] !== undefined,
    );

    expect(carried.sort()).toEqual(schemaKeys.sort());
  });
});
