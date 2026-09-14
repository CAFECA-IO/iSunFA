/**
 * Info: (20260914 - Julian) 公司設定的**讀寫往返**：GET 交出來的形狀，PUT 一定要收得下。
 *
 * ## 這一組為什麼存在
 *
 * 20260914 的 issue：`optionalText` 寫的是 `.optional()`，它收
 * `string | undefined` 而**不收 `null`**。而這一頁的資料流每一圈都會產生
 * `null`：GET 回 `address: null` → 表單顯示成 `""` → 送出時正規化回 `null`
 * → **400 `VA_INVALID_INPUT_DATA`**。
 *
 * 也就是說，只要三個可空欄位裡有任何一格沒填，這張表單就存不進去 ——
 * 而畫面上只會說「儲存失敗」，看不出是哪一格、也看不出為什麼。
 * 三格剛好全填滿時會成功，所以手動測很容易整輪都不踩到。
 *
 * tsc 也不會說話：`zod` 的輸入型別與 `IAccountBookCompanyProfile` 之間
 * 沒有任何一行程式碼要求它們相符 —— 中間隔著一次 HTTP 的 JSON。
 *
 * ## 所以測的是「兩端接得上」，不是各自的規則
 *
 * 下面的 payload 一律由**真的正規化函式**（`companyProfileFormToPayload`）
 * 產生，而不是手寫一份 JSON。手寫的話，表單改了正規化規則、
 * 這裡的 JSON 沒跟著改，測試會繼續綠而使用者繼續 400。
 */

import { describe, it, expect } from "@jest/globals";
import { LeaveYearScheme } from "@/generated";
import { AccountBookCompanyProfileSchema } from "@/validators/salary_company_profile";
import {
  companyProfileFormToPayload,
  type ICompanyProfileForm,
} from "@/lib/utils/company_profile_form";
import { IAccountBookCompanyProfile } from "@/interfaces/salary_company_profile";

const formOf = (override: Partial<ICompanyProfileForm> = {}) => ({
  entityName: "小花有限公司",
  taxId: "",
  responsiblePerson: "",
  address: "",
  scheme: null,
  startMonth: "",
  startDay: "",
  ...override,
});

describe("表單送得出來的東西，後端一定收得下", () => {
  /**
   * Info: (20260914 - Julian) 這幾種形狀都是使用者按一下儲存就送得出來的。
   *
   * 每一種都曾經（或可能）是 400。少了這一組，把 `.nullish()` 改回
   * `.optional()` 不會有任何紅燈 —— 而那一個字就是這次的 issue。
   */
  it.each([
    ["只填公司名稱，其餘全空", formOf()],
    [
      "填了統編與負責人，地址空著（issue 實際的形狀）",
      formOf({ taxId: "123", responsiblePerson: "王小花" }),
    ],
    [
      "三個可空欄位都填",
      formOf({
        taxId: "12345678",
        responsiblePerson: "王小花",
        address: "台北市信義區",
      }),
    ],
    ["選了曆年制", formOf({ scheme: LeaveYearScheme.CALENDAR })],
    ["選了週年制", formOf({ scheme: LeaveYearScheme.ANNIVERSARY })],
    [
      "選了約定年度並填了月日",
      formOf({
        scheme: LeaveYearScheme.CUSTOM,
        startMonth: "3",
        startDay: "1",
      }),
    ],
  ])("%s", (_label, form) => {
    const result = AccountBookCompanyProfileSchema.safeParse(
      companyProfileFormToPayload(form),
    );

    expect(result.success).toBe(true);
  });

  /**
   * Info: (20260914 - Julian) GET 回來的那一份原樣送回去也要收得下。
   *
   * 「讀得到但存不回去」是一個使用者一定會走到的路徑：打開設定頁、
   * 什麼都不改、按儲存。這一條直接用 `IAccountBookCompanyProfile`
   * 當型別，所以介面日後多一個可空欄位而 schema 忘了跟上時，
   * 這裡會在型別層先擋下來。
   */
  it("GET 交出來的一份原樣送回去（打開頁面、什麼都不改、按儲存）", () => {
    const fromServer: IAccountBookCompanyProfile = {
      entityName: "小花有限公司",
      taxId: null,
      responsiblePerson: null,
      address: null,
      leaveYearScheme: null,
      leaveYearStartMonth: null,
      leaveYearStartDay: null,
    };

    expect(AccountBookCompanyProfileSchema.safeParse(fromServer).success).toBe(
      true,
    );
  });
});

describe("「沒填」的三種送法都收斂成 null", () => {
  /**
   * Info: (20260914 - Julian) 同一個「沒填」有兩種表示的話，下一個人寫
   * `taxId ?? "—"` 時，空字串會穿過 `??` 顯示成一格空白。
   */
  it.each([
    ["null", null],
    ["空字串", ""],
    ["只有空白", "   "],
  ])("taxId 是 %s 時存成 null", (_label, taxId) => {
    const parsed = AccountBookCompanyProfileSchema.parse({
      entityName: "小花有限公司",
      taxId,
      leaveYearScheme: null,
    });

    expect(parsed.taxId).toBeNull();
  });

  it("整個不給這個鍵時也存成 null", () => {
    const parsed = AccountBookCompanyProfileSchema.parse({
      entityName: "小花有限公司",
      leaveYearScheme: null,
    });

    expect(parsed.taxId).toBeNull();
    expect(parsed.responsiblePerson).toBeNull();
    expect(parsed.address).toBeNull();
  });
});

/**
 * Info: (20260914 - Julian) 放寬的那一格不可以把別的擋門一起放掉。
 *
 * 這一組是上面那一組的對照：`.nullish()` 是為了收「沒填的可空欄位」，
 * 不是為了讓什麼都過。少了它，把整個 schema 改成 `z.any()` 也會全綠。
 */
describe("該擋的還是要擋", () => {
  it("公司名稱是空的就擋下來（它是薪資單上的署名，唯一必填）", () => {
    expect(
      AccountBookCompanyProfileSchema.safeParse(
        companyProfileFormToPayload(formOf({ entityName: "" })),
      ).success,
    ).toBe(false);
  });

  it("公司名稱是 null 也擋（可空的是那三格，不是這一格）", () => {
    expect(
      AccountBookCompanyProfileSchema.safeParse({
        entityName: null,
        leaveYearScheme: null,
      }).success,
    ).toBe(false);
  });

  it("選了約定年度卻沒給起日 —— 擋", () => {
    expect(
      AccountBookCompanyProfileSchema.safeParse({
        entityName: "小花有限公司",
        leaveYearScheme: LeaveYearScheme.CUSTOM,
        leaveYearStartMonth: null,
        leaveYearStartDay: null,
      }).success,
    ).toBe(false);
  });

  /**
   * Info: (20260914 - Julian) 反方向也要擋：選了曆年制卻帶著上一次的 3/1。
   *
   * 那組數字不會被用到，但它會留在資料庫裡，而下一個讀它的人
   * 分不出那是設定還是殘留。
   */
  it("非約定年度卻帶著起日 —— 擋", () => {
    expect(
      AccountBookCompanyProfileSchema.safeParse({
        entityName: "小花有限公司",
        leaveYearScheme: LeaveYearScheme.CALENDAR,
        leaveYearStartMonth: 3,
        leaveYearStartDay: 1,
      }).success,
    ).toBe(false);
  });

  it("不存在的特休年度制度 —— 擋", () => {
    expect(
      AccountBookCompanyProfileSchema.safeParse({
        entityName: "小花有限公司",
        leaveYearScheme: "LUNAR",
      }).success,
    ).toBe(false);
  });

  it("超長的地址 —— 擋（欄位上限沒有被放寬掉）", () => {
    expect(
      AccountBookCompanyProfileSchema.safeParse({
        entityName: "小花有限公司",
        address: "台".repeat(201),
        leaveYearScheme: null,
      }).success,
    ).toBe(false);
  });
});
