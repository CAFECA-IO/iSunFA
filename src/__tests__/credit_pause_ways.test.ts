import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";

import { extractCreditPauseDetail } from "@/hooks/use_carbon_chat.helpers";
import { ApiError as RequestApiError } from "@/lib/utils/request";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  QUOTA_EXCEEDED_OPTION,
  QUOTA_WINDOW,
} from "@/constants/subscription_quota";

/**
 * Info: (20260827 - Luphia) 暫停時「接下來能做什麼」（issue #6714）。
 *
 * 在此之前畫面只說「點數已用完，以下章節還沒開始解析」——**沒有一個字**說得出
 * 接下來能做什麼。而伺服器的 402 早就把出路與雙視窗的重置時間算好了，
 * 前端一個欄位都沒有讀。
 */

const RESET_5H = 1_787_000_000;
const RESET_WEEK = 1_787_400_000;

function quotaError(over: Record<string, unknown> = {}): RequestApiError {
  return new RequestApiError("quota exceeded", 402, {
    success: false,
    errorCode: API_ERRORS.TW_QUOTA_EXCEEDED.code,
    payload: {
      exceeded: QUOTA_WINDOW.PER_5H,
      quota5h: { limit: "100", used: "100", resetAt: RESET_5H },
      quotaWeek: { limit: "750", used: "200", resetAt: RESET_WEEK },
      allocationBalance: "0",
      exceedsWindowLimit: false,
      options: [
        QUOTA_EXCEEDED_OPTION.WAIT_RESET,
        QUOTA_EXCEEDED_OPTION.UPGRADE_PLAN,
      ],
      ...over,
    },
  } as unknown as Record<string, unknown>);
}

describe("extractCreditPauseDetail：搬伺服器算好的，不重算", () => {
  it("取出被擋下那個視窗的重置時間與出路", () => {
    const detail = extractCreditPauseDetail(quotaError());
    expect(detail).not.toBeNull();
    expect(detail?.resetAt).toBe(RESET_5H);
    expect(detail?.options).toEqual([
      QUOTA_EXCEEDED_OPTION.WAIT_RESET,
      QUOTA_EXCEEDED_OPTION.UPGRADE_PLAN,
    ]);
    expect(detail?.exceedsWindowLimit).toBe(false);
  });

  /**
   * Info: (20260827 - Luphia) 週額度用罄時，5 小時視窗的 resetAt 早得多——
   * 拿它報時會讓使用者白等一場（`resolveQuotaResetAt` 的既有教訓，
   * 這一條確保搬過來的時候沒有搬錯那一半）。
   */
  it("週視窗被擋時報週的重置時間，不是 5 小時那個", () => {
    const detail = extractCreditPauseDetail(
      quotaError({ exceeded: QUOTA_WINDOW.PER_WEEK }),
    );
    expect(detail?.resetAt).toBe(RESET_WEEK);
  });

  /**
   * Info: (20260827 - Luphia) 超過整個視窗上限時**不給** resetAt：那種情況
   * 等重置永遠不會好，而一個倒數本身就是「等一下就能用」的承諾。
   */
  it("超過視窗上限時不給重置時間", () => {
    const detail = extractCreditPauseDetail(
      quotaError({ exceedsWindowLimit: true }),
    );
    expect(detail?.exceedsWindowLimit).toBe(true);
    expect(detail?.resetAt).toBeNull();
  });

  /**
   * Info: (20260827 - Luphia) 取不到就回 null，呼叫端據此「只說原因、不說出路」
   * ——那比顯示一個空的出路清單好。
   */
  it.each([
    [
      "需要簽章付款的 402（沒有額度視窗可談）",
      new RequestApiError("payment required", 402, {
        success: false,
        errorCode: API_ERRORS.TW_PERSONAL_PAYMENT_REQUIRED.code,
      } as unknown as Record<string, unknown>),
    ],
    [
      "payload 形狀不符（缺 options）",
      new RequestApiError("quota exceeded", 402, {
        success: false,
        errorCode: API_ERRORS.TW_QUOTA_EXCEEDED.code,
        payload: { exceeded: QUOTA_WINDOW.PER_5H },
      } as unknown as Record<string, unknown>),
    ],
    ["完全不是 API 錯誤", new Error("network down")],
  ])("認不出時回 null：%s", (_label, error) => {
    expect(extractCreditPauseDetail(error)).toBeNull();
  });

  /**
   * Info: (20260827 - Luphia) 回傳的是**複製**而不是同一個陣列參照：
   * 那份 payload 會被寫進暫存並落地，共用參照時後續的修改會靜靜地改到已存的資料。
   */
  it("出路是複製，不是共用參照", () => {
    const error = quotaError();
    const detail = extractCreditPauseDetail(error);
    detail?.options.push("MUTATED");
    const again = extractCreditPauseDetail(error);
    expect(again?.options).toHaveLength(2);
  });
});

describe("出路的畫面", () => {
  const component = readFileSync(
    join(
      process.cwd(),
      "src",
      "components",
      "carbon_chatbot",
      "credit_pause_ways.tsx",
    ),
    "utf8",
  );
  const preview = readFileSync(
    join(
      process.cwd(),
      "src",
      "components",
      "carbon_chatbot",
      "import_preview.tsx",
    ),
    "utf8",
  );

  /**
   * Info: (20260827 - Luphia) 只在「點數用完」那種暫停顯示。中斷（關分頁、切走）
   * 不需要補點數，使用者只要按「接著匯入」——那時擺一組導購按鈕是在叫他去買
   * 他不需要的東西。
   */
  it("中斷時不顯示出路（要同時有暫停原因與細節）", () => {
    expect(preview).toContain(
      "pendingImport.pauseReason && pendingImport.pauseDetail",
    );
  });

  /**
   * Info: (20260827 - Luphia) 倒數與絕對時間並列：倒數回答「還要多久」，
   * 絕對時間回答「是幾點」，只給一種都會有人算錯。
   */
  it("倒數與絕對時間都給", () => {
    expect(component).toContain("describeQuotaCountdown");
    expect(component).toContain("Intl.DateTimeFormat");
    expect(component).toContain("countdown: countdownText");
    expect(component).toContain("resetAt: resetAtText");
  });

  // Info: (20260827 - Luphia) 超過視窗上限時換一套說法，且不顯示倒數
  it("超過視窗上限時不顯示倒數", () => {
    const overAt = component.indexOf("detail.exceedsWindowLimit ?");
    expect(overAt).toBeGreaterThan(-1);
    const branch = component.slice(overAt, overAt + 300);
    expect(branch).toContain("import_paused_over_window_limit");
    expect(branch).not.toContain("countdownText");
  });

  /**
   * Info: (20260827 - Luphia) 出路用查表而不是 switch：`options` 來自網路，
   * 而伺服器可能比這一版的前端更新。認不出的值要被濾掉，不是變成畫面上的
   * `undefined`。
   */
  it("認不出的出路值被濾掉", () => {
    expect(component).toContain("OPTION_LABEL_KEYS[option]");
    expect(component).toContain("filter((key): key is string => Boolean(key))");
  });

  /**
   * Info: (20260827 - Luphia) 額度儀表刻意不顯示：`limit` / `used` 在重新整理
   * 之後就過時了，而使用者會據此判斷還能不能跑——顯示一個過時的儀表比
   * 不顯示更糟。這一條擋住「順手加上去」。
   */
  it("不顯示會過時的額度數字", () => {
    expect(component).not.toContain("QuotaMeter");
    expect(component).not.toContain("quotaRemainingPercent");
  });

  // Info: (20260827 - Luphia) 導購開新視窗：原地跳頁會清掉幾分鐘的解析結果
  it("導購連結開新視窗", () => {
    expect(component).toContain('target="_blank"');
    expect(component).toContain('rel="noopener noreferrer"');
  });
});

describe("出路要撐過重新整理", () => {
  const hook = readFileSync(
    join(process.cwd(), "src", "hooks", "use_carbon_chat.ts"),
    "utf8",
  );
  const validator = readFileSync(
    join(process.cwd(), "src", "validators", "carbon_pending_import.ts"),
    "utf8",
  );

  it("落地的明列帶上 pauseDetail", () => {
    const start = hook.indexOf("const persistPendingImport = useCallback");
    const end = hook.indexOf("const clearPersistedPendingImport", start);
    expect(hook.slice(start, end)).toContain("pauseDetail");
  });

  it("驗證器接受 pauseDetail，且不收會過時的額度數字", () => {
    expect(validator).toContain("pauseDetail:");
    expect(validator).toContain("exceedsWindowLimit: z.boolean()");
    const start = validator.indexOf("pauseDetail:");
    const scope = validator.slice(start, start + 400);
    expect(scope).not.toContain("used:");
    expect(scope).not.toContain("limit:");
  });

  /**
   * Info: (20260827 - Luphia) 中斷的檢查點不留出路（issue #6723）：
   * 使用者不需要補點數，留一份清單在那裡會讓畫面叫他去買不需要的東西。
   */
  it("中斷的檢查點不留出路", () => {
    const start = hook.indexOf("const persistCheckpoint = (");
    const end = hook.indexOf("if (useChunked) {", start);
    expect(hook.slice(start, end)).toContain("pauseDetail: null");
  });

  /**
   * Info: (20260827 - Luphia) 第一次撞牆的那份留著就好：後面每一份都被同一面牆
   * 擋下，內容一樣，而覆寫會讓 resetAt 一直往後跳幾毫秒。
   */
  it("只留第一次撞牆的那一份", () => {
    expect(hook).toContain("if (pauseDetail === null) {");
  });

  it.each(["zh_tw", "zh_cn", "en", "ja", "ko"])(
    "%s 有八條出路文案",
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
      [
        "import_paused_reset_hint",
        "import_paused_reset_ready",
        "import_paused_over_window_limit",
        "import_paused_ways_title",
        "import_paused_option_wait_reset",
        "import_paused_option_use_allocation",
        "import_paused_option_use_personal",
        "import_paused_option_upgrade",
      ].forEach((key) => expect(file).toContain(`${key}:`));
    },
  );
});
