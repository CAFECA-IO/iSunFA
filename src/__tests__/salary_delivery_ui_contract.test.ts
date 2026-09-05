import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import path from "path";
import { ApiError } from "@/lib/utils/request";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  DELIVERY_FAILURE_I18N_KEY,
  failureKindOf,
  type SalaryDeliveryFailureKind,
} from "@/hooks/use_salary_pay_slip_delivery";

/**
 * Info: (20260904 - Julian) 薪資單寄送的前端契約。
 *
 * ## 為什麼是分類測試 + 掃描，不是 render 測試
 *
 * 本專案的 jest 是 `testEnvironment: "node"`，全專案沒有任何一支 render React
 * （同 `salary_provider_scope.test.ts` 的理由）。而這一段前端有兩件事值得釘住，
 * 兩件都不需要 render：
 *
 * 1. **錯誤分類**是一支純函式，而它讀錯欄位會靜默降級成「請稍後再試」。
 * 2. **上一版的假實作**（`console.log` 的寄送、可編輯的收件信箱、
 *    `dummySentData`）是靠掃描才擋得住回頭 —— 型別上它們完全合法。
 */

const read = (relativePath: string): string =>
  readFileSync(path.join(process.cwd(), "src", relativePath), "utf-8");

/**
 * Info: (20260904 - Julian) 剝掉註解再掃。
 *
 * 本檔案要驗的是「程式碼裡沒有 X」，而這幾支檔案的註解裡就寫著
 * `console.log`、`dummySentData` 這些字（說明上一版做錯了什麼）。
 * 不剝的話，這些條會因為註解而永遠紅 —— 然後被人刪掉。
 */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const apiErrorOf = (errorCode: string): ApiError =>
  new ApiError("failed", 500, { errorCode });

describe("寄送失敗的分類", () => {
  /**
   * Info: (20260904 - Julian) 三種失敗的**處置完全不同**：沒有信箱要去改員工資料、
   * SMTP 未設定要找管理員、缺中文字型只有維運裝得了字型。
   * 全部收斂成一句「請稍後再試」的話，前兩種的使用者會一直重試
   * 一件永遠不會成功的事。
   */
  const CASES: [string, SalaryDeliveryFailureKind][] = [
    [API_ERRORS.VA_SALARY_EMPLOYEE_NO_EMAIL.code, "no-email"],
    [API_ERRORS.TW_MAIL_NOT_CONFIGURED.code, "not-configured"],
    [API_ERRORS.IS_PDF_FONT_UNAVAILABLE.code, "font-missing"],
  ];

  it.each(CASES)("代碼 %s 分到 %s", (code, kind) => {
    expect(failureKindOf(apiErrorOf(code))).toBe(kind);
  });

  it("四種分類兩兩不同，沒有兩個代碼撞在同一格", () => {
    const kinds = CASES.map(([code]) => failureKindOf(apiErrorOf(code)));

    expect(new Set(kinds).size).toBe(CASES.length);
    expect(kinds).not.toContain("generic");
  });

  it("沒見過的代碼落到 generic", () => {
    expect(failureKindOf(apiErrorOf("XX999999"))).toBe("generic");
  });

  it("不是 ApiError 的東西也落到 generic，不會爆", () => {
    expect(failureKindOf(new Error("network down"))).toBe("generic");
    expect(failureKindOf(null)).toBe("generic");
    expect(failureKindOf(undefined)).toBe("generic");
  });

  /**
   * Info: (20260904 - Julian) `request.ts` 的 `ApiError` 只有 `status` 與 `data`
   * 兩個欄位，代碼在 `data.errorCode` 裡。讀 `error.code` 會拿到 `undefined`
   * 而靜靜落到 `generic` —— 三種各有不同處置的失敗全部變成同一句話，
   * 而且不會有任何錯誤訊息。這一條釘住取法。
   */
  it("代碼取自 data.errorCode，不是 ApiError 上不存在的 code 欄位", () => {
    const error = apiErrorOf(API_ERRORS.VA_SALARY_EMPLOYEE_NO_EMAIL.code);

    expect((error as unknown as { code?: string }).code).toBeUndefined();
    expect(failureKindOf(error)).toBe("no-email");
  });

  it("data 是 null 或形狀不對時不會爆", () => {
    expect(failureKindOf(new ApiError("failed", 500))).toBe("generic");
    expect(failureKindOf(new ApiError("failed", 500, "not an object"))).toBe(
      "generic",
    );
  });

  it("每一種分類都有對應的文案 key", () => {
    const kinds: SalaryDeliveryFailureKind[] = [
      "no-email",
      "not-configured",
      "font-missing",
      "generic",
    ];

    kinds.forEach((kind) => {
      expect(DELIVERY_FAILURE_I18N_KEY[kind]).toMatch(
        /^calculator\.sending_pay_slip_modal\.error_/,
      );
    });
    // Info: (20260904 - Julian) 四個 key 各不相同，否則兩種失敗會顯示同一句話
    expect(new Set(Object.values(DELIVERY_FAILURE_I18N_KEY)).size).toBe(
      kinds.length,
    );
  });
});

describe("寄送彈窗：收件信箱是唯讀的", () => {
  const source = stripComments(
    read("components/salary_calculator/sending_pay_slip_modal.tsx"),
  );

  /**
   * Info: (20260904 - Julian) 計畫書 D3：**這個欄位的來源是員工檔，要改它就去改員工檔。**
   *
   * 上一版這裡是一個預填員工信箱的可編輯輸入框。允許當場修改的話，
   * 薪資單可以被寄到任意地址，而改掉的那一次不會留在員工檔上 ——
   * 事後查不出當初為什麼寄去那裡。
   *
   * 後端那一側已經擋死（端點的 body 是空的），但前端留著輸入框仍然是錯的：
   * 它讓使用者以為改得動，而改了之後寄出去的還是原本那個信箱。
   */
  it("彈窗裡沒有任何輸入框", () => {
    expect(source).not.toContain("<input");
  });

  it("收件信箱不是本地 state（沒有東西可以改它）", () => {
    expect(source).not.toContain("setEmailInput");
    expect(source).not.toMatch(/useState<string>\(employeeEmail\)/);
  });

  it("收件信箱直接來自 prop", () => {
    expect(source).toContain("employeeEmail");
  });

  it("不再有 console.log 的假實作", () => {
    expect(source).not.toContain("console.log");
  });

  it("真的去呼叫寄送 API", () => {
    expect(source).toContain("useSalaryPaySlipDelivery");
    expect(source).toContain("deliver(recordId)");
  });

  /**
   * Info: (20260904 - Julian) 失敗就留在原地顯示原因 —— 關掉等於把錯誤藏起來，
   * 而使用者會以為寄出去了。
   */
  it("寄失敗時不關閉彈窗", () => {
    expect(source).toMatch(/if \(!delivered\) return;/);
  });
});

describe("重寄彈窗：不再是假的", () => {
  const source = stripComments(
    read("components/salary_calculator/resending_pay_slip_modal.tsx"),
  );

  /**
   * Info: (20260904 - Julian) 上一版是 `console.log("Reset Pay Slip")`
   * 加一個 `setTimeout(3000)` 假裝在寄，然後顯示成功。
   * 也就是重寄從來沒有真的寄過，而畫面會告訴使用者成功了。
   */
  it("沒有 console.log，也沒有 setTimeout 假裝在寄", () => {
    expect(source).not.toContain("console.log");
    expect(source).not.toContain("setTimeout");
  });

  it("真的去呼叫寄送 API", () => {
    expect(source).toContain("useSalaryPaySlipDelivery");
    expect(source).toContain("deliver(recordId)");
  });

  /**
   * Info: (20260904 - Julian) 成功狀態綁在後端真的回了一列上（`sent`），
   * 不是一個自己翻的布林 —— 上一版的 `resendSuccess` 是後者。
   */
  it("成功畫面看的是後端回來的那一列，不是自己翻的旗標", () => {
    expect(source).not.toContain("resendSuccess");
    expect(source).toMatch(/else if \(sent\)/);
  });
});

describe("已寄出分頁：接的是真資料", () => {
  it("dummySentData 已經從整個 src 消失", () => {
    const files = [
      "interfaces/pay_slip.ts",
      "components/salary_calculator/pay_slip_sent_tab.tsx",
      "components/salary_calculator/my_pay_slip_page_body.tsx",
    ];

    files.forEach((file) => {
      expect(stripComments(read(file))).not.toContain("dummySentData");
    });
  });

  it("ISentRecord 這個型別也不見了（形狀改由寄送紀錄提供）", () => {
    expect(stripComments(read("interfaces/pay_slip.ts"))).not.toContain(
      "ISentRecord",
    );
  });

  it("分頁讀的是寄送紀錄的清單形狀", () => {
    const source = stripComments(
      read("components/salary_calculator/pay_slip_sent_tab.tsx"),
    );

    expect(source).toContain("ISalaryPaySlipDeliveryListItem");
  });

  it("清單本身不帶薪資單快照，點開才去取", () => {
    const tab = stripComments(
      read("components/salary_calculator/pay_slip_sent_tab.tsx"),
    );
    const listItem = stripComments(
      read("interfaces/salary_pay_slip_delivery.ts"),
    );

    /**
     * Info: (20260904 - Julian) 清單一次列 50 列，而 `result` 是一整份薪資明細。
     * 讓清單帶著它等於把整本帳每一位員工的完整薪資結構送進瀏覽器，
     * 而使用者一次只點開一列。
     */
    expect(listItem).not.toMatch(/^\s*result:/m);
    expect(tab).toContain("useSalaryRecordDetail");
  });

  /**
   * Info: (20260904 - Julian) 失敗的列存在是為了稽核與診斷（計畫書 §2.1），
   * 不是為了給使用者看 ——「我寄出的薪資單」這張表若混進沒寄成功的，
   * 使用者會以為對方收到了。
   */
  it("只列寄成功的", () => {
    const source = stripComments(read("hooks/use_salary_pay_slip_delivery.ts"));

    expect(source).toContain("SALARY_DELIVERY_STATUS.SENT");
    expect(source).toContain("sentDeliveries");
  });

  it("「已收到」那一半仍是假資料，而且那件事有被寫下來", () => {
    // Info: (20260904 - Julian) 這一條刻意是「還沒做」的紀錄，不是缺陷
    expect(read("interfaces/pay_slip.ts")).toContain("dummyReceivedData");
    expect(read("interfaces/pay_slip.ts")).toContain("§10.6");
  });
});

describe("計算機頁的寄出按鈕", () => {
  const source = stripComments(
    read("components/salary_calculator/salary_result_section.tsx"),
  );

  it("按鈕不再是被註解掉的", () => {
    expect(source).toContain("sendingBtnClickHandler");
    expect(source).toContain("calculator.button.send");
  });

  /**
   * Info: (20260904 - Julian) 寄送的對象是一筆**薪資紀錄**。計算機畫面上的數字
   * 在按下「儲存」之前不是任何一筆紀錄 —— 沒有 `savedRecord` 就沒有東西可以寄，
   * 而端點唯一的輸入就是 `record_id`。
   */
  it("沒存過就寄不出去", () => {
    expect(source).toContain("send_disabled_unsaved");
    expect(source).toMatch(/if \(!savedRecord\) return/);
  });

  it("沒有信箱也寄不出去，而且說得出為什麼", () => {
    expect(source).toContain("send_disabled_no_email");
    expect(source).toContain('employeeEmail.trim() === ""');
  });

  it("寄出專屬的兩種原因各有各的文案", () => {
    const reasons = ["send_disabled_unsaved", "send_disabled_no_email"];

    reasons.forEach((reason) => expect(source).toContain(reason));
    expect(new Set(reasons).size).toBe(reasons.length);
  });

  /**
   * Info: (20260904 - Julian) 「四個步驟沒填完」由共用的 `disabled_hint` 講，
   * 它同時管著下載與儲存。初版讓寄出也講一次，畫面上就疊出兩行只差三個字的句子
   * （「才能寄出薪資單」／「才能下載或儲存薪資單」）—— 同一個成因、同一個下一步。
   *
   * 這一條釘住「原因相同時只講一句」：兩個提示的顯示條件必須互斥。
   */
  it("沒填完時不再重複講一次（讓位給共用的 disabled_hint）", () => {
    expect(source).not.toContain("send_disabled_incomplete");
    /**
     * Info: (20260904 - Julian) 用 regex 而不是 `toContain`：prettier 會依行寬
     * 把長條件折行，而折點會隨著周圍的縮排變動 —— 寫死一整行的字串，
     * 這條測試會在某次無關的排版變動後紅掉，然後被人改成寬鬆的版本。
     */
    expect(source).toMatch(/!btnDisabled &&\s*sendDisabledReason !== null/);
    expect(source).toMatch(/\{btnDisabled &&\s*\(/);
  });

  it("按鈕的停用條件仍然包含「沒填完」，只是那件事由別人講", () => {
    expect(source).toMatch(
      /const sendDisabled =\s*btnDisabled \|\| sendDisabledReason !== null;/,
    );
    expect(source).toContain("disabled={sendDisabled}");
  });

  /**
   * Info: (20260904 - Julian) 公開版沒有帳本也沒有員工檔，寄不出去也不該看得到
   * 這顆按鈕（同「儲存」的處置）。
   */
  it("公開版看不到這顆按鈕", () => {
    expect(source).toContain("accountBookId !== null");
  });

  it("寄的是存下來的那一筆，不是畫面上的數字", () => {
    expect(source).toContain("recordId={savedRecord.id}");
  });
});

describe("預覽彈窗的寄送入口", () => {
  const source = stripComments(
    read("components/salary_calculator/view_pay_slip_modal.tsx"),
  );

  /**
   * Info: (20260904 - Julian) 上一版只看 `sentDate && sentTo` —— 那兩個是**顯示用**
   * 的資料，有它們不代表這個畫面有能力呼叫寄送 API。假資料時代看不出差別
   * （按下去只是 `console.log`），接上真 API 之後就是一顆按下去必然失敗的按鈕。
   *
   *「我收到的薪資單」分頁正是這種情況：它看的是別人寄來的單子，沒有 `recordId`。
   */
  it("拿不到 recordId 就沒有寄送入口", () => {
    expect(source).toContain("const canSend = !!accountBookId && !!recordId;");
    expect(source).toMatch(/\{canSend && \(/);
  });

  /**
   * Info: (20260904 - Julian) 「這一筆寄過沒有」問伺服器，不看 props。
   *
   * 同事可能十分鐘前才剛寄過，而呼叫端手上的清單是更早以前抓的。
   * 薪資紀錄頁尤其如此：那一頁根本不知道任何一筆寄過沒有 ——
   * 它連 `sentDate` / `sentTo` 都傳不出來。
   */
  it("寄過沒有是問伺服器來的，不是靠 props 推的", () => {
    expect(source).toContain("useSalaryRecordDeliveries");
    expect(source).toContain("lastSent");
  });

  /**
   * Info: (20260904 - Julian) 一顆按鈕兩種字，而不是兩顆按鈕其中一顆永遠停用 ——
   * 停用的按鈕使用者得先讀懂才知道不用理它。
   */
  it("同一顆按鈕依「寄過沒有」換字，不是兩顆", () => {
    expect(source).toMatch(
      /lastSent\s*\?\s*t\("calculator\.button\.re_send"\)\s*:\s*t\("calculator\.button\.send"\)/,
    );
  });

  it("寄過的走重寄確認，沒寄過的走寄出確認", () => {
    expect(source).toMatch(/lastSent && \(\s*<ResendingPaySlipModal/);
    expect(source).toMatch(/!lastSent && \(\s*<SendingPaySlipModal/);
  });

  /**
   * Info: (20260904 - Julian) 只有「還沒寄過」那條路會被擋：重寄不需要收件信箱
   * （伺服器自己推導），也不受員工被移除影響 —— 那時它本來就會 404，
   * 而畫面已經有一次成功寄送的紀錄可以顯示。
   */
  it("停用只發生在還沒寄過的情況，而且說得出為什麼", () => {
    expect(source).toContain("sendBlockedReason");

    /**
     * Info: (20260904 - Julian) **按鈕的 `disabled` 與提示文字要分開驗。**
     *
     * 初版只驗了提示那一段的條件，於是把 `disabled` 裡的守衛整個拿掉
     * 仍然全綠 —— 而那個狀態是：畫面寫著「這位員工沒有信箱」，
     * 按鈕卻按得下去，按下去開一個必然失敗的彈窗。
     * 提示與停用是兩件事，兩件都要釘。
     */
    expect(source).toMatch(
      /disabled=\{\s*isLoadingHistory \|\|\s*\(!lastSent && sendBlockedReason !== undefined\)\s*\}/,
    );
    expect(source).toMatch(
      /\{canSend && !lastSent && sendBlockedReason !== undefined && \(/,
    );
  });
});

describe("薪資紀錄頁的寄送入口", () => {
  const source = stripComments(
    read("components/salary_calculator/salary_records_page_body.tsx"),
  );

  /**
   * Info: (20260904 - Julian) 計畫書 §6.1 的第三列，PR C 初版漏掉了。
   *
   * 缺了它，「從薪資紀錄列表點開一筆從沒寄過的」這條路寄不出去 ——
   * 而那大概是最自然的入口：計算機頁只能寄剛剛存的那一筆，
   * 「已寄出」分頁只能重寄寄過的。
   */
  it("預覽彈窗拿得到帳本與紀錄 id", () => {
    expect(source).toContain("accountBookId={accountBookId}");
    expect(source).toContain("recordId={viewing.id}");
  });

  /**
   * Info: (20260904 - Julian) 查不到員工有兩種意思，**下一步完全不同**：
   * 「有這個人但沒填信箱」要去員工列表補；「查不到這個人」是他已被軟刪 ——
   * 薪資紀錄仍在（薪資單是對外憑據），但伺服器的 `getActiveEmployeeById` 會過濾
   * `deletedAt`，寄送必然回 404。叫使用者去補信箱只會白跑一趟。
   */
  it("沒信箱與員工已移除是兩種不同的理由", () => {
    expect(source).toContain("send_disabled_no_email");
    expect(source).toContain("send_disabled_employee_gone");
  });

  /**
   * Info: (20260904 - Julian) 名單載入中或名單掛了的時候，每個人都「查不到」——
   * 這一頁上面那段註解記的正是這個歧義。那時不下結論，但也不放行。
   */
  it("名單還沒確定時不猜成因，也不放行", () => {
    expect(source).toMatch(
      /isEmployeesLoading \|\| hasEmployeesError.*\n?.*send_disabled_loading/s,
    );
  });
});

describe("薪資紀錄列表的寄出狀態", () => {
  const page = stripComments(
    read("components/salary_calculator/salary_records_page_body.tsx"),
  );
  const repo = stripComments(read("repositories/salary_record.repo.ts"));

  it("每一列顯示寄出狀態，未寄出與已寄出是兩種樣子", () => {
    expect(page).toContain("calculator.records.delivery_status");
    expect(page).toContain("calculator.records.not_sent");
    expect(page).toContain("record.lastSentAt === null");
  });

  it("已寄出那一格帶著日期與當初的收件信箱", () => {
    expect(page).toContain("timestampToString(record.lastSentAt)");
    expect(page).toContain("record.lastSentTo");
  });

  /**
   * Info: (20260904 - Julian) **狀態必須由伺服器算。**
   *
   * 看似可以拿整本帳的寄送清單（`GET salary_calculator/delivery`）在前端
   * index 起來比對 —— 但那一支有 200 筆上限且是全帳本新的在前，於是一本
   * 累積久了的帳，**舊紀錄會靜靜地顯示成「未寄出」**。使用者看到那個字
   * 會再寄一次，而對方已經收過了。錯的答案長得跟對的一樣。
   *
   * 這一條釘住那條路沒有被走回去。
   */
  it("狀態不是拿整本帳的寄送清單在前端對照出來的", () => {
    expect(page).not.toContain("useSalaryPaySlipDeliveries");
    /**
     * Info: (20260904 - Julian) 只擋整本帳的寄送清單那一支，不是所有 API ——
     * 這一頁本來就要用 `salaryCalculatorApiOf(...).RECORD` 抓薪資紀錄。
     * 初版寫成擋 `salaryCalculatorApiOf` 整個名字，那是一條會擋住正確做法的假限制。
     */
    expect(page).not.toContain(".DELIVERY");
  });

  /**
   * Info: (20260904 - Julian) 三個 include 站點都要帶上關聯。
   *
   * 少帶一個的話，那條路徑回來的 `lastSentAt` 是 `null` —— 而 `null` 的意思是
   * 「從未寄出」，不是「這次沒問」。兩者在型別上長得一模一樣，而畫面會照著它寫字。
   */
  it("repository 的每一條讀取路徑都帶上最近一次寄送", () => {
    /**
     * Info: (20260904 - Julian) 釘的是**不變量**，不是站點數量。
     *
     * 初版寫死「恰好 3 處」，而 CSV 匯出加了第 4 條讀取路徑（`listRecordsByIds`）
     * 之後它就紅了 —— 但那次改動是對的（新路徑有帶 include），
     * 紅的是測試的形式。數字形式只能一直往上調，而調它的人不會去想
     * 「新加的那一條有沒有帶」；問「每一個 include 是不是都用共用常數」
     * 才是原本要守的事，而且新增讀取路徑時自動納入。
     */
    expect(repo).not.toContain("include: { employee: true }");

    const includes = repo.match(/include:\s*[^,\n]+/g) ?? [];
    expect(includes.length).toBeGreaterThan(2);
    includes.forEach((site) => expect(site).toContain("RECORD_INCLUDE"));
  });

  it("只有成功的那一次算「已寄出」", () => {
    expect(repo).toMatch(/where: \{ status: SALARY_DELIVERY_STATUS\.SENT \}/);
    expect(repo).toContain("take: 1");
  });
});

describe("薪資紀錄列表的寄出按鈕", () => {
  const page = stripComments(
    read("components/salary_calculator/salary_records_page_body.tsx"),
  );

  it("列上就能寄，不必先點開預覽", () => {
    expect(page).toContain("onClick={() => setSending(record)}");
    expect(page).toContain("<SendingPaySlipModal");
    expect(page).toContain("<ResendingPaySlipModal");
  });

  it("寄過的走重寄，沒寄過的走寄出", () => {
    expect(page).toMatch(
      /sending\.lastSentAt === null && \(\s*<SendingPaySlipModal/,
    );
    expect(page).toMatch(
      /sending\.lastSentAt !== null && \(\s*<ResendingPaySlipModal/,
    );
  });

  /**
   * Info: (20260904 - Julian) 圖示按鈕沒有文字，停用之後畫面上沒有地方說得出
   * 為什麼（列表沒有空間放一行說明）—— 所以理由掛在 `title` 上。
   */
  it("停用時 title 換成原因，而不是只留一個灰掉的圖示", () => {
    expect(page).toContain("blockedReason !== undefined");
    expect(page).toContain("send_disabled_employee_gone");
    expect(page).toContain("send_disabled_no_email");
  });

  /**
   * Info: (20260904 - Julian) 已經寄過的那些不受阻擋：重寄不需要收件信箱
   * （伺服器自己推導），也不受員工被移除影響。
   */
  it("阻擋只發生在還沒寄過的那些", () => {
    expect(page).toMatch(
      /disabled=\{\s*record\.lastSentAt === null &&\s*sendTargetOf\(record\.employee\.id\)\.blockedReason !== undefined\s*\}/,
    );
  });

  it("寄出成功之後重抓，那一列才會從「未寄出」變成日期", () => {
    expect(page).toMatch(/onSent=\{\(\) => \{[\s\S]{0,200}?reload\(\);/);
    expect(page).toMatch(/onResent=\{\(\) => \{[\s\S]{0,200}?reload\(\);/);
  });

  /**
   * Info: (20260904 - Julian) 預覽彈窗與列表問的是同一個問題，
   * 答案不該有兩套推導 —— 兩邊各寫一次的話，改一邊忘了另一邊是必然。
   */
  it("列表與預覽彈窗共用同一支寄送目標推導", () => {
    expect(page).toContain("const sendTargetOf = (");
    expect(page).toContain("sendTargetOf(viewing.employee.id)");
    expect(page).toContain("sendTargetOf(record.employee.id)");
  });
});

describe("薪資紀錄列表的匯出入口", () => {
  const page = stripComments(
    read("components/salary_calculator/salary_records_page_body.tsx"),
  );

  /**
   * Info: (20260904 - Julian) **匯出鈕不可以藏在勾選後面。**
   *
   * 初版寫成 `{picked.size > 0 && ( ...匯出鈕... )}`，動機是不想擺一顆
   * 永遠灰著的按鈕。那個判斷是反的：這顆按鈕是匯出功能唯一的入口，
   * 而「先勾幾筆」是只有已經知道有匯出的人才會做的動作 ——
   * 對其他人來說，這個功能在畫面上不存在。
   *
   * 這一條釘的是「永遠 render」。它會在有人為了版面清爽而把工具列
   * 包回條件式裡的那一刻轉紅，而那個改動在手動點過時看起來完全正常
   * （測試的人本來就知道要先勾選）。
   */
  it("匯出鈕永遠顯示，不是勾了才出現", () => {
    expect(page).toContain("calculator.records.export_csv");
    expect(page).not.toMatch(/\{\s*picked\.size > 0 && \(/);
  });

  /**
   * Info: (20260904 - Julian) 永遠顯示的前提是「沒選就按不下去」。
   * 少了這個守衛，空選會送出一個 `recordIds: []` 的請求 ——
   * 伺服器擋得下（回 400），但使用者看到的是「按了、失敗了」。
   */
  it("一筆都沒選時是停用的", () => {
    /**
     * Info: (20260904 - Julian) 綁在 `exportDisabled` 這個定義上，
     * 不是全檔搜 `picked.size === 0` —— `exportHandler` 裡也有一句同形的
     * 保險，寫寬了會讓「按鈕拿掉守衛」這個 mutation 靜靜地通過（試過了）。
     */
    expect(page).toMatch(/const exportDisabled =[^;]*picked\.size === 0/);
    expect(page).toContain("disabled={exportDisabled}");
  });

  /**
   * Info: (20260904 - Julian) 匯出中要擋住第二次點擊，超過上限也要擋 ——
   * 後者若放行，使用者會等一趟往返才知道被拒絕。
   */
  it("匯出中與超過上限一樣擋下", () => {
    expect(page).toMatch(/const exportDisabled =[^;]*isExporting/);
    expect(page).toMatch(/const exportDisabled =[^;]*tooManyPicked/);
    expect(page).toContain("SALARY_EXPORT_MAX_RECORDS");
  });

  /**
   * Info: (20260904 - Julian) 上限是多少只有程式知道，所以停用的理由要說出數字；
   * 而「還沒選」看筆數就知道，不需要再寫一句。理由掛 `title`，
   * 與列表的寄出鈕同一種做法。
   */
  it("超過上限時 title 說得出上限，沒選則不囉嗦", () => {
    expect(page).toMatch(
      /exportDisabledReason = tooManyPicked[\s\S]{0,200}?export_too_many/,
    );
    expect(page).toContain("title={exportDisabledReason ?? undefined}");
    expect(page).not.toContain("export_disabled_no_selection");
  });

  /**
   * Info: (20260904 - Julian) 失敗必須看得見。
   * 只靠 `title` 的話，按下去、轉一圈、什麼都沒發生 ——
   * 而使用者的下一個動作是再按一次。
   */
  it("匯出失敗有畫面上的訊息，不是只寫進 console", () => {
    expect(page).toMatch(
      /exportFailed && \([\s\S]{0,200}?calculator\.records\.export_failed/,
    );
  });

  /**
   * Info: (20260904 - Julian) CSV 不是 JSON 信封。用 `request` 會把它丟進
   * `JSON.parse`，錯誤訊息會指向一個與成因無關的位置。
   */
  it("走 requestFile 而不是 request", () => {
    expect(page).toContain("requestFile(salaryRecordExportApi(");
    expect(page).toContain("saveDownloadedFile(");
  });

  /**
   * Info: (20260904 - Julian) 成功之後清空勾選：留著的話，使用者換一組條件
   * 再按一次會把上一批也一起帶走，而檔案已經下載，他不會回頭數裡面有幾列。
   */
  it("匯出成功後清空勾選", () => {
    expect(page).toMatch(
      /saveDownloadedFile\([\s\S]{0,200}?setPicked\(new Set\(\)\)/,
    );
  });
});

describe("listByRecord 有讀者", () => {
  /**
   * Info: (20260904 - Julian) 計畫書 §6.3 的教訓：`SalaryRecord.createdByUserId`
   * 加了欄位卻沒有任何讀者，稽核價值等於零。同樣的道理適用於方法 ——
   * 一支沒有呼叫端的 repository 方法只是還沒被發現的死碼。
   *
   * PR C 初版就是這樣：repo 與 service 都實作了 `listByRecord`，
   * 而它本來是為了「已寄過的顯示 Resending」寫的，那一列卻沒做。
   */
  it("端點與前端都真的用到它", () => {
    const route = stripComments(
      read(
        "app/api/v1/user/account_book/[account_book_id]/salary_calculator/record/[record_id]/deliver/route.ts",
      ),
    );
    const hook = stripComments(read("hooks/use_salary_pay_slip_delivery.ts"));

    expect(route).toContain("listByRecord");
    expect(route).toContain("export async function GET(");
    expect(hook).toContain("useSalaryRecordDeliveries");
  });

  /**
   * Info: (20260904 - Julian) 失敗的列不算「寄過」—— 對方沒有收到任何東西，
   * 按鈕該寫「寄出」而不是「重新寄送」。
   */
  it("只有成功的那些算寄過", () => {
    const hook = stripComments(read("hooks/use_salary_pay_slip_delivery.ts"));

    expect(hook).toMatch(
      /lastSent =\s*deliveries\.find\([\s\S]*?SALARY_DELIVERY_STATUS\.SENT/,
    );
  });
});
