import { describe, it, expect, beforeEach } from "@jest/globals";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { HTTP_MAP } from "@/lib/utils/status";
import {
  defaultSalaryCalculatorResult,
  ISalaryCalculatorOptions,
  ISalaryCalculatorUI,
} from "@/interfaces/salary_calculator";
import {
  ISalaryCalculatorEmployee,
  ISalaryRecordDetail,
  ISalaryRecordPageResult,
} from "@/interfaces/salary_record";
import {
  ISalaryPaySlipDelivery,
  ISalaryPaySlipDeliveryListItem,
  ISalaryPaySlipDeliveryWriteInput,
} from "@/interfaces/salary_pay_slip_delivery";
import {
  SALARY_DELIVERY_FAILURE_REASON_MAX_LENGTH,
  SALARY_DELIVERY_STATUS,
  truncateFailureReason,
} from "@/constants/salary_delivery";
import { DEFAULT_EMPLOYEE_PROFILE } from "@/lib/utils/salary_employee_profile";
import type { ISalaryCalculatorEmployeeRepository } from "@/repositories/salary_calculator_employee.repo";
import type { ISalaryRecordRepository } from "@/repositories/salary_record.repo";
import type { ISalaryPaySlipDeliveryRepository } from "@/repositories/salary_pay_slip_delivery.repo";
import type { ISalaryPaySlipPdf } from "@/services/salary_pay_slip_pdf.service";
import type { IPaySlipHtmlInput } from "@/lib/utils/pay_slip_html";
import type { IMailMessage } from "@/services/mail.service";
import { MailNotConfiguredError } from "@/services/mail.service";
import {
  ISalaryMailSender,
  ISalaryPaySlipPdfGenerator,
  SalaryPaySlipDeliveryService,
} from "@/services/salary_pay_slip_delivery.service";

/**
 * Info: (20260904 - Julian) 薪資單寄送 service 的編排。
 *
 * ## 這支 service 的價值全在「失敗時做了什麼」
 *
 * 成功路徑很短：產 PDF、寄信、寫一列。真正需要被釘住的是三件事，
 * 每一件都無法從型別或成功路徑看出來：
 *
 * 1. **落地與丟錯誤的先後。** 先丟的話那一列永遠不會出現，
 *    而「寄失敗過」正是最需要被記下來的事 —— 重試三次都失敗，
 *    與從未寄過，在畫面上長得一模一樣。
 * 2. **哪一種失敗刻意不落地。** SMTP 未設定是環境問題，不是這一次寄送的事實；
 *    記下來會讓管理員設好 SMTP 之後留一堆與員工無關的失敗紀錄，
 *    而「這位員工寄失敗過嗎」這個查詢從此不可信。
 * 3. **已分類的錯誤代碼不能被蓋掉。** `IS_PDF_FONT_UNAVAILABLE`（缺中文字型，
 *    唯一解法是裝字型）被包成通用寄送失敗之後，維運只能靠猜。
 *
 * ## 為什麼 PDF 與寄信是注入的假物件
 *
 * 沿用本專案的慣例（`salary_record_service.test.ts` 有明文）：不 mock 模組，
 * service 的 constructor 本來就開放注入。要驗上面三件事就得讓「PDF 失敗」與
 * 「SMTP 失敗」隨叫隨到 —— 而真的那兩支一個要啟動 Chrome、一個要連 SMTP。
 */

const BOOK = "book-a";
const OTHER_BOOK = "book-b";
const USER = "user-1";
const EMPLOYEE_ID = "11111111-1111-4111-8111-111111111111";
const RECORD_ID = "33333333-3333-4333-8333-333333333333";

const httpOf = (def: { status: keyof typeof HTTP_MAP }): number =>
  HTTP_MAP[def.status];

const employeeOf = (
  overrides: Partial<ISalaryCalculatorEmployee> = {},
): ISalaryCalculatorEmployee => ({
  ...DEFAULT_EMPLOYEE_PROFILE,
  id: EMPLOYEE_ID,
  name: "王小明",
  number: "A001",
  email: "ming@example.com",
  ...overrides,
});

const recordOf = (
  overrides: Partial<ISalaryRecordDetail> = {},
): ISalaryRecordDetail => ({
  id: RECORD_ID,
  year: 2026,
  month: 9,
  employee: { id: EMPLOYEE_ID, name: "王小明", number: "A001" },
  totalPayment: 41234,
  totalSalaryTaxable: 32000,
  totalEmployerCost: 45678,
  calculatorVersion: "2026.1",
  createdAt: 1_756_000_000,
  updatedAt: 1_756_000_000,
  // Info: (20260904 - Julian) 這一支測的是寄送編排，預設當作「還沒寄過」
  lastSentAt: null,
  lastSentTo: null,
  input: { year: 2026, month: 9 } as unknown as ISalaryCalculatorOptions,
  result: {
    ...defaultSalaryCalculatorResult,
    totalPayment: 41234,
    totalSalaryTaxable: 32000,
  } as ISalaryCalculatorUI,
  ...overrides,
});

/**
 * Info: (20260904 - Julian) 假的員工 repository。
 *
 * 以 `(帳本, 員工)` 為鍵，租戶過濾才在測試裡真的成立 —— 只用 employeeId
 * 的話，「拿別的帳本的紀錄來寄」這種案例會靜靜地通過。
 */
class FakeEmployeeRepo implements ISalaryCalculatorEmployeeRepository {
  constructor(private readonly rows: Map<string, ISalaryCalculatorEmployee>) {}

  async listEmployees(): Promise<ISalaryCalculatorEmployee[]> {
    return [...this.rows.values()];
  }

  async getActiveEmployeeById(
    accountBookId: string,
    employeeId: string,
  ): Promise<ISalaryCalculatorEmployee | null> {
    return this.rows.get(`${accountBookId}:${employeeId}`) ?? null;
  }

  async createEmployee(): Promise<ISalaryCalculatorEmployee> {
    throw new Error("not used in these tests");
  }

  async updateEmployee(): Promise<ISalaryCalculatorEmployee | null> {
    throw new Error("not used in these tests");
  }

  async softDeleteEmployee(): Promise<boolean> {
    throw new Error("not used in these tests");
  }

  public setEmail(email: string): void {
    const key = `${BOOK}:${EMPLOYEE_ID}`;
    const existing = this.rows.get(key);
    if (existing) this.rows.set(key, { ...existing, email });
  }
}

class FakeRecordRepo implements ISalaryRecordRepository {
  constructor(private readonly rows: Map<string, ISalaryRecordDetail>) {}

  async upsertRecord(): Promise<ISalaryRecordDetail> {
    throw new Error("not used in these tests");
  }

  async listRecords(): Promise<ISalaryRecordPageResult> {
    throw new Error("not used in these tests");
  }

  async listRecordsByIds(): Promise<ISalaryRecordDetail[]> {
    throw new Error("not used in these tests");
  }

  async getRecordById(
    accountBookId: string,
    recordId: string,
  ): Promise<ISalaryRecordDetail | null> {
    return this.rows.get(`${accountBookId}:${recordId}`) ?? null;
  }

  async deleteRecord(): Promise<boolean> {
    throw new Error("not used in these tests");
  }
}

class FakeDeliveryRepo implements ISalaryPaySlipDeliveryRepository {
  public readonly created: ISalaryPaySlipDeliveryWriteInput[] = [];
  public failOnCreate: Error | null = null;

  async createDelivery(
    input: ISalaryPaySlipDeliveryWriteInput,
  ): Promise<ISalaryPaySlipDelivery> {
    if (this.failOnCreate) throw this.failOnCreate;
    this.created.push(input);
    return {
      id: `delivery-${this.created.length}`,
      salaryRecordId: input.salaryRecordId,
      recipientEmail: input.recipientEmail,
      status: input.status,
      failureReason: input.failureReason ?? null,
      sentBy: { id: input.sentByUserId, name: "會計小美" },
      createdAt: 1_756_100_000,
    };
  }

  async listByRecord(): Promise<ISalaryPaySlipDelivery[]> {
    return [];
  }

  async listByAccountBook(): Promise<ISalaryPaySlipDeliveryListItem[]> {
    return [];
  }
}

class FakePdf implements ISalaryPaySlipPdfGenerator {
  public readonly calls: IPaySlipHtmlInput[] = [];
  public failWith: Error | null = null;

  async generate(input: IPaySlipHtmlInput): Promise<ISalaryPaySlipPdf> {
    this.calls.push(input);
    if (this.failWith) throw this.failWith;
    const content = Buffer.from("%PDF-1.4 fake");
    return {
      fileName: `payslip_${input.year}-0${input.month}_A001_王小明.pdf`,
      content,
      sizeBytes: content.length,
    };
  }
}

class FakeMailer implements ISalaryMailSender {
  public readonly sent: IMailMessage[] = [];
  public failWith: Error | null = null;

  async send(message: IMailMessage): Promise<void> {
    if (this.failWith) throw this.failWith;
    this.sent.push(message);
  }
}

let employees: FakeEmployeeRepo;
let records: FakeRecordRepo;
let deliveries: FakeDeliveryRepo;
let pdf: FakePdf;
let mailer: FakeMailer;
let service: SalaryPaySlipDeliveryService;

const deliver = (
  overrides: Partial<{ accountBookId: string; recordId: string }> = {},
) =>
  service.deliver({
    accountBookId: BOOK,
    recordId: RECORD_ID,
    userId: USER,
    ...overrides,
  });

beforeEach(() => {
  employees = new FakeEmployeeRepo(
    new Map([[`${BOOK}:${EMPLOYEE_ID}`, employeeOf()]]),
  );
  records = new FakeRecordRepo(new Map([[`${BOOK}:${RECORD_ID}`, recordOf()]]));
  deliveries = new FakeDeliveryRepo();
  pdf = new FakePdf();
  mailer = new FakeMailer();
  service = new SalaryPaySlipDeliveryService(
    employees,
    records,
    deliveries,
    pdf,
    mailer,
  );
});

describe("deliver — 成功路徑", () => {
  it("落地一列 SENT，且沒有失敗原因", async () => {
    const result = await deliver();

    expect(deliveries.created).toHaveLength(1);
    expect(deliveries.created[0].status).toBe(SALARY_DELIVERY_STATUS.SENT);
    expect(deliveries.created[0].failureReason).toBeNull();
    expect(result.status).toBe(SALARY_DELIVERY_STATUS.SENT);
  });

  it("寄到員工檔上的信箱，而不是任何輸入帶進來的位址", async () => {
    await deliver();

    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0].to).toBe("ming@example.com");
    expect(deliveries.created[0].recipientEmail).toBe("ming@example.com");
  });

  it("PDF 拿到的是這一筆紀錄的期間、姓名與結果快照", async () => {
    await deliver();

    expect(pdf.calls).toHaveLength(1);
    expect(pdf.calls[0]).toMatchObject({
      employeeName: "王小明",
      employeeNumber: "A001",
      year: 2026,
      month: 9,
    });
    expect(pdf.calls[0].result.totalPayment).toBe(41234);
  });

  it("附件是 PDF 服務產出的那一份，檔名與內容原樣帶過去", async () => {
    await deliver();

    const attachments = mailer.sent[0].attachments ?? [];
    expect(attachments).toHaveLength(1);
    expect(attachments[0].filename).toBe("payslip_2026-09_A001_王小明.pdf");
    expect(attachments[0].contentType).toBe("application/pdf");
    expect(attachments[0].content.toString()).toBe("%PDF-1.4 fake");
  });

  /**
   * Info: (20260904 - Julian) 計畫書 D1：本文不寫金額。
   *
   * 本文會出現在信箱的預覽列、通知列與鎖定畫面上 —— 把實發金額寫進本文，
   * 等於讓它出現在員工手機的通知欄，而那是他自己控制不了的一塊螢幕。
   */
  it("信件本文與主旨都不含任何金額", async () => {
    await deliver();

    const { subject, text, html } = mailer.sent[0];
    const amounts = ["41234", "41,234", "32000", "32,000", "45678"];
    amounts.forEach((amount) => {
      expect(subject).not.toContain(amount);
      expect(text).not.toContain(amount);
      expect(html).not.toContain(amount);
    });
  });

  it("主旨帶期間，本文帶姓名，兩種內文都有", async () => {
    await deliver();

    const { subject, text, html } = mailer.sent[0];
    expect(subject).toContain("2026 年 9 月");
    expect(text).toContain("王小明");
    expect(html).toContain("王小明");
    expect(text.length).toBeGreaterThan(0);
  });

  it("寄送者記的是傳進來的 userId", async () => {
    await deliver();

    expect(deliveries.created[0].sentByUserId).toBe(USER);
  });
});

describe("deliver — 擋在門口的三種情況", () => {
  it("紀錄不存在：NF_SALARY_RECORD，而且什麼都沒做", async () => {
    await expect(deliver({ recordId: "no-such-record" })).rejects.toMatchObject(
      { apiCode: API_ERRORS.NF_SALARY_RECORD.code },
    );

    expect(pdf.calls).toHaveLength(0);
    expect(mailer.sent).toHaveLength(0);
    expect(deliveries.created).toHaveLength(0);
  });

  /**
   * Info: (20260904 - Julian) 別的帳本的紀錄 id 猜對了也讀不到 ——
   * repository 以 `(帳本, 紀錄)` 為鍵，而 service 傳的帳本來自路徑。
   */
  it("換一本帳去拿同一個 recordId：一樣是 404，不是寄給別人", async () => {
    await expect(deliver({ accountBookId: OTHER_BOOK })).rejects.toMatchObject({
      apiCode: API_ERRORS.NF_SALARY_RECORD.code,
    });

    expect(mailer.sent).toHaveLength(0);
  });

  it("員工檔不見了（軟刪除）：NF_SALARY_CALCULATOR_EMPLOYEE", async () => {
    const empty = new FakeEmployeeRepo(new Map());
    service = new SalaryPaySlipDeliveryService(
      empty,
      records,
      deliveries,
      pdf,
      mailer,
    );

    await expect(deliver()).rejects.toMatchObject({
      apiCode: API_ERRORS.NF_SALARY_CALCULATOR_EMPLOYEE.code,
    });
    expect(deliveries.created).toHaveLength(0);
  });
});

describe("deliver — 沒有信箱是資料狀態，不是故障", () => {
  /**
   * Info: (20260904 - Julian) 這一條的重點在**狀態碼不是 500**。
   *
   * `SalaryCalculatorEmployee.email` 可空是刻意的（不少帳本不替員工建信箱）。
   * 回 500 的話，前端只能顯示「系統錯誤」，而使用者要做的事其實很明確：
   * 去員工資料補一個信箱。
   */
  it("空字串：回 VA_SALARY_EMPLOYEE_NO_EMAIL 且不是 500", async () => {
    employees.setEmail("");

    await expect(deliver()).rejects.toMatchObject({
      apiCode: API_ERRORS.VA_SALARY_EMPLOYEE_NO_EMAIL.code,
    });
    expect(httpOf(API_ERRORS.VA_SALARY_EMPLOYEE_NO_EMAIL)).not.toBe(500);
    expect(httpOf(API_ERRORS.VA_SALARY_EMPLOYEE_NO_EMAIL)).toBeLessThan(500);
  });

  /**
   * Info: (20260904 - Julian) 全是空白的信箱送進 SMTP 只會換來一個看起來像故障的
   * 連線層錯誤，而成因是資料。這裡要在送出去之前就分辨出來。
   */
  it("全是空白：與空字串同樣處置", async () => {
    employees.setEmail("   ");

    await expect(deliver()).rejects.toMatchObject({
      apiCode: API_ERRORS.VA_SALARY_EMPLOYEE_NO_EMAIL.code,
    });
  });

  it("沒有信箱時不產 PDF、不寄信、也不落地任何一列", async () => {
    employees.setEmail("");

    await expect(deliver()).rejects.toThrow(AppError);

    expect(pdf.calls).toHaveLength(0);
    expect(mailer.sent).toHaveLength(0);
    expect(deliveries.created).toHaveLength(0);
  });
});

describe("deliver — 失敗時先落地再丟錯誤", () => {
  /**
   * Info: (20260904 - Julian) 順序倒過來（先 throw 再落地）的話，
   * 下面這兩條的 `created` 會是 0 —— 那正是計畫書 §8 列的必跑 mutation 之二。
   */
  it("PDF 失敗：落地一列 FAILED", async () => {
    pdf.failWith = new Error("chrome exploded");

    await expect(deliver()).rejects.toThrow(AppError);

    expect(deliveries.created).toHaveLength(1);
    expect(deliveries.created[0].status).toBe(SALARY_DELIVERY_STATUS.FAILED);
    expect(deliveries.created[0].failureReason).toContain("chrome exploded");
  });

  it("SMTP 失敗：落地一列 FAILED", async () => {
    mailer.failWith = new Error("smtp down");

    await expect(deliver()).rejects.toThrow(AppError);

    expect(deliveries.created).toHaveLength(1);
    expect(deliveries.created[0].status).toBe(SALARY_DELIVERY_STATUS.FAILED);
    expect(deliveries.created[0].failureReason).toContain("smtp down");
  });

  it("失敗那一列記的是當初要寄去的信箱與這一筆紀錄", async () => {
    mailer.failWith = new Error("smtp down");

    await expect(deliver()).rejects.toThrow(AppError);

    expect(deliveries.created[0]).toMatchObject({
      accountBookId: BOOK,
      salaryRecordId: RECORD_ID,
      sentByUserId: USER,
      recipientEmail: "ming@example.com",
    });
  });

  it("PDF 失敗時不會再去寄信", async () => {
    pdf.failWith = new Error("chrome exploded");

    await expect(deliver()).rejects.toThrow(AppError);

    expect(mailer.sent).toHaveLength(0);
  });

  it("通用失敗對外是 TW_SALARY_PAY_SLIP_MAIL_FAILED", async () => {
    mailer.failWith = new Error("smtp down");

    await expect(deliver()).rejects.toMatchObject({
      apiCode: API_ERRORS.TW_SALARY_PAY_SLIP_MAIL_FAILED.code,
    });
  });

  /**
   * Info: (20260904 - Julian) 落地失敗列的時候資料庫剛好也不通。
   *
   * 沒有這一層保護的話，使用者收到的是一個 Prisma 的連線錯誤，
   * 而真正的成因（SMTP 掛了）連 log 都不會有 —— 補救的方向會整個歪掉。
   */
  it("連失敗列都寫不進去時，原本的錯誤仍然是往上丟的那一個", async () => {
    mailer.failWith = new Error("smtp down");
    deliveries.failOnCreate = new Error("db unreachable");

    await expect(deliver()).rejects.toMatchObject({
      apiCode: API_ERRORS.TW_SALARY_PAY_SLIP_MAIL_FAILED.code,
    });
  });
});

describe("deliver — SMTP 未設定不落地", () => {
  /**
   * Info: (20260904 - Julian) 這是唯一一種「失敗了但不留紀錄」的情況。
   *
   * 那是環境問題，不是這一次寄送的事實。記下來的話，管理員設好 SMTP 之後
   * 會留著一堆與員工無關的失敗紀錄，而「這位員工的薪資單寄失敗過嗎」
   * 這個查詢從此不可信 —— 那正是這張表存在的唯一理由。
   */
  it("MailNotConfiguredError：回 TW_MAIL_NOT_CONFIGURED，且**沒有**落地任何一列", async () => {
    mailer.failWith = new MailNotConfiguredError(["SMTP_HOST"]);

    await expect(deliver()).rejects.toMatchObject({
      apiCode: API_ERRORS.TW_MAIL_NOT_CONFIGURED.code,
    });

    expect(deliveries.created).toHaveLength(0);
  });

  it("與一般 SMTP 失敗是兩個不同的代碼（處置不同：一個要設定，一個可重試）", () => {
    expect(API_ERRORS.TW_MAIL_NOT_CONFIGURED.code).not.toBe(
      API_ERRORS.TW_SALARY_PAY_SLIP_MAIL_FAILED.code,
    );
  });
});

describe("deliver — 已分類的錯誤代碼不被蓋掉", () => {
  /**
   * Info: (20260904 - Julian) 缺中文字型的唯一解法是裝字型，重試一萬次都一樣。
   *
   * `salary_pay_slip_pdf.service` 已經在自己那一層擋下「被包成通用列印失敗」，
   * 但它丟的是 `ApiError`，而薪資 route 的 catch 只認得 `AppError` ——
   * 這一層若不轉換，同一個缺陷會在上一層原封不動地再發生一次。
   */
  it("IS_PDF_FONT_UNAVAILABLE 原樣傳到外面，不變成通用寄送失敗", async () => {
    pdf.failWith = new ApiError(
      API_ERRORS.IS_PDF_FONT_UNAVAILABLE.code,
      API_ERRORS.IS_PDF_FONT_UNAVAILABLE.message,
      API_ERRORS.IS_PDF_FONT_UNAVAILABLE.status,
    );

    await expect(deliver()).rejects.toMatchObject({
      apiCode: API_ERRORS.IS_PDF_FONT_UNAVAILABLE.code,
    });
  });

  it("轉出來的是 AppError，route 的 catch 才認得（否則會落到 IS_DB_FAILED）", async () => {
    pdf.failWith = new ApiError(
      API_ERRORS.IS_PDF_FONT_UNAVAILABLE.code,
      API_ERRORS.IS_PDF_FONT_UNAVAILABLE.message,
      API_ERRORS.IS_PDF_FONT_UNAVAILABLE.status,
    );

    await expect(deliver()).rejects.toBeInstanceOf(AppError);
  });

  it("字型錯誤同樣要落地 FAILED —— 它是一次真的寄送失敗", async () => {
    pdf.failWith = new ApiError(
      API_ERRORS.IS_PDF_FONT_UNAVAILABLE.code,
      API_ERRORS.IS_PDF_FONT_UNAVAILABLE.message,
      API_ERRORS.IS_PDF_FONT_UNAVAILABLE.status,
    );

    await expect(deliver()).rejects.toThrow(AppError);
    expect(deliveries.created).toHaveLength(1);
    expect(deliveries.created[0].status).toBe(SALARY_DELIVERY_STATUS.FAILED);
  });
});

describe("deliver — 收件信箱存的是當下的值", () => {
  /**
   * Info: (20260904 - Julian) 這張表存在的理由之一。
   *
   * 員工的 email 之後會被改。查「這封三月的薪資單當初寄到哪」時，
   * 若是查詢時 join 員工檔，得到的是今天的信箱 ——
   * 而那正是稽核最需要答案的那一格。
   *
   * 這裡驗的是 service 傳了什麼下去；「存進去之後不跟著變」由
   * `salary_delivery_repo.e2e.test.ts` 用真的資料庫驗。
   */
  it("員工改了信箱之後再寄，兩列各自記著寄出當下的那一個", async () => {
    await deliver();
    employees.setEmail("ming.new@example.com");
    await deliver();

    expect(deliveries.created.map((row) => row.recipientEmail)).toEqual([
      "ming@example.com",
      "ming.new@example.com",
    ]);
  });

  it("同一筆紀錄可以寄很多次（補寄、對方說沒收到都是真實情境）", async () => {
    await deliver();
    await deliver();
    await deliver();

    expect(deliveries.created).toHaveLength(3);
    expect(
      deliveries.created.every((row) => row.salaryRecordId === RECORD_ID),
    ).toBe(true);
  });
});

describe("truncateFailureReason", () => {
  /**
   * Info: (20260904 - Julian) 這一欄的內容來自 SMTP 伺服器或 Chrome 的錯誤訊息，
   * 長度不由我們決定 —— 它們偶爾會回傳整段 stack 或一大塊 HTML。
   */
  it("超長訊息被截到上限", () => {
    const long = "x".repeat(SALARY_DELIVERY_FAILURE_REASON_MAX_LENGTH + 1000);

    expect(truncateFailureReason(long)).toHaveLength(
      SALARY_DELIVERY_FAILURE_REASON_MAX_LENGTH,
    );
  });

  it("剛好在上限的訊息不被動到", () => {
    const exact = "x".repeat(SALARY_DELIVERY_FAILURE_REASON_MAX_LENGTH);

    expect(truncateFailureReason(exact)).toBe(exact);
  });

  it("空字串與 null 都變成 null，不是空字串", () => {
    expect(truncateFailureReason("")).toBeNull();
    expect(truncateFailureReason(null)).toBeNull();
    expect(truncateFailureReason(undefined)).toBeNull();
  });

  it("一般長度的訊息原樣保留", () => {
    expect(truncateFailureReason("Error: smtp down")).toBe("Error: smtp down");
  });
});
