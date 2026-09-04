import { AppError } from "@/lib/utils/error";
import { API_ERRORS, ApiError, IErrorDef } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import {
  SALARY_DELIVERY_STATUS,
  SalaryDeliveryStatus,
} from "@/constants/salary_delivery";
import {
  ISalaryPaySlipDelivery,
  ISalaryPaySlipDeliveryListItem,
} from "@/interfaces/salary_pay_slip_delivery";
import {
  ISalaryCalculatorEmployeeRepository,
  salaryCalculatorEmployeeRepo,
} from "@/repositories/salary_calculator_employee.repo";
import {
  ISalaryRecordRepository,
  salaryRecordRepo,
} from "@/repositories/salary_record.repo";
import {
  ISalaryPaySlipDeliveryRepository,
  salaryPaySlipDeliveryRepo,
} from "@/repositories/salary_pay_slip_delivery.repo";
import {
  ISalaryPaySlipPdf,
  SalaryPaySlipPdfService,
} from "@/services/salary_pay_slip_pdf.service";
import { IPaySlipHtmlInput } from "@/lib/utils/pay_slip_html";
import { buildPaySlipMail } from "@/lib/utils/pay_slip_mail";
import {
  IMailMessage,
  MailNotConfiguredError,
  sendMail,
} from "@/services/mail.service";

/**
 * Info: (20260904 - Julian) 把一筆薪資紀錄變成一封帶 PDF 附件的信，並記下這件事。
 *
 * ## 為什麼 PDF 與寄信是建構子參數
 *
 * 這支 service 的價值全在**失敗時做了什麼**：哪一種失敗要落地、
 * 落地與丟錯誤的先後、哪一種失敗刻意不落地。要驗這些就得能讓
 * 「PDF 失敗」與「SMTP 失敗」隨叫隨到 —— 而它們一個要啟動 Chrome、
 * 一個要連 SMTP。做成注入的埠之後，測試給的是手寫的假物件，
 * 不必 mock 模組，也不必啟動任何外部程序（同本專案其他 service 的作法）。
 */

export interface ISalaryPaySlipPdfGenerator {
  generate(input: IPaySlipHtmlInput): Promise<ISalaryPaySlipPdf>;
}

export interface ISalaryMailSender {
  send(message: IMailMessage): Promise<void>;
}

const PDF_CONTENT_TYPE = "application/pdf";

/**
 * Info: (20260904 - Julian) 錯誤展開：JSON.stringify(error) 對 Error 實例永遠印出 {}
 * （message/stack 皆為不可列舉屬性）。這段字會存進 `failureReason`，
 * 是事後唯一能回答「當初為什麼寄不出去」的東西。
 */
const describeError = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);

/**
 * Info: (20260904 - Julian) `ApiError` → `AppError`，**保留原本的代碼與狀態**。
 *
 * 兩個類別做同一件事，而薪資 route 的 catch 只認得 `AppError`
 * （其他模組的 route 認 `ApiError`）。直接讓 `ApiError` 冒上去的話，
 * route 會落到最後那一行的 `IS_DB_FAILED`，於是
 * `IS_PDF_FONT_UNAVAILABLE`（伺服器缺中文字型，唯一解法是裝字型）
 * 對外變成一個看起來值得重試的 500 —— 而重試一萬次都一樣。
 *
 * 這正是 `salary_pay_slip_pdf.service.ts` 在自己那一層擋下來的同一個缺陷，
 * 只是換到了上一層。轉換而不是重新分類，代碼才走得完全程。
 */
const toAppError = (error: unknown): AppError => {
  if (error instanceof AppError) return error;
  if (error instanceof ApiError) {
    return new AppError({
      code: error.code,
      message: error.message,
      status: error.status,
    } as IErrorDef);
  }
  return new AppError(API_ERRORS.TW_SALARY_PAY_SLIP_MAIL_FAILED);
};

export class SalaryPaySlipDeliveryService {
  constructor(
    private readonly employees: ISalaryCalculatorEmployeeRepository,
    private readonly records: ISalaryRecordRepository,
    private readonly deliveries: ISalaryPaySlipDeliveryRepository,
    private readonly pdf: ISalaryPaySlipPdfGenerator,
    private readonly mailer: ISalaryMailSender,
  ) {}

  /**
   * Info: (20260904 - Julian) 寄出一筆薪資紀錄的薪資單。
   *
   * Body 為空是刻意的（計畫書 D3）：收件人、金額、期間全部由伺服器從
   * `recordId` 推導，沒有任何一項可以由前端指定。允許當場改收件信箱的話，
   * 薪資單可以被寄到任意地址，而改掉的那一次不會留在員工檔上 ——
   * 事後查不出當初寄去哪。
   */
  public async deliver({
    accountBookId,
    recordId,
    userId,
  }: {
    accountBookId: string;
    recordId: string;
    userId: string;
  }): Promise<ISalaryPaySlipDelivery> {
    const record = await this.records.getRecordById(accountBookId, recordId);
    if (!record) {
      throw new AppError(API_ERRORS.NF_SALARY_RECORD);
    }

    /**
     * Info: (20260904 - Julian) 另外讀一次員工檔，不用 `record.employee`。
     *
     * 薪資紀錄上的 employee 只帶 id / name / number（列表要顯示的三欄），
     * 沒有 email —— 而 email 正是這裡唯一必要的新資訊。
     * 順帶得到的是租戶再確認一次：這一支也是以 `accountBookId` 為第一個條件。
     */
    const employee = await this.employees.getEmployeeById(
      accountBookId,
      record.employee.id,
    );
    if (!employee) {
      throw new AppError(API_ERRORS.NF_SALARY_CALCULATOR_EMPLOYEE);
    }

    /**
     * Info: (20260904 - Julian) 沒有信箱是**資料狀態，不是故障** —— 回 4xx 不是 500。
     *
     * `SalaryCalculatorEmployee.email` 可空是刻意的（不少帳本不替員工建信箱）。
     * 前端會把沒有信箱的員工的寄送按鈕停用並說明原因（計畫書 §6.2），
     * 但那是體驗，不是保證：API 自己要擋得住。
     *
     * 用 `trim()` 判空：全是空白的信箱送進 SMTP 只會換來一個看起來像故障的
     * 連線層錯誤，而成因是資料。
     */
    const recipientEmail = employee.email.trim();
    if (recipientEmail === "") {
      throw new AppError(API_ERRORS.VA_SALARY_EMPLOYEE_NO_EMAIL);
    }

    try {
      const pdf = await this.pdf.generate({
        employeeName: employee.name,
        employeeNumber: employee.number,
        year: record.year,
        month: record.month,
        result: record.result,
      });

      await this.mailer.send({
        to: recipientEmail,
        ...buildPaySlipMail({
          employeeName: employee.name,
          year: record.year,
          month: record.month,
        }),
        attachments: [
          {
            filename: pdf.fileName,
            content: pdf.content,
            contentType: PDF_CONTENT_TYPE,
          },
        ],
      });
    } catch (error) {
      /**
       * Info: (20260904 - Julian) SMTP 未設定**不落地 FAILED**。
       *
       * 那是環境問題，不是這一次寄送的事實。記下來的話，管理員設好 SMTP 之後
       * 會留著一堆與員工無關的失敗紀錄，而「這位員工的薪資單寄失敗過」
       * 這個查詢從此不可信 —— 那正是這張表存在的唯一理由。
       */
      if (error instanceof MailNotConfiguredError) {
        logger.error("[SalaryPaySlipDelivery] mail not configured", {
          accountBookId,
          recordId,
        });
        throw new AppError(API_ERRORS.TW_MAIL_NOT_CONFIGURED);
      }

      /**
       * Info: (20260904 - Julian) **先落地 FAILED，再把錯誤丟出去。順序不能倒。**
       *
       * 先丟錯誤的話這一列永遠不會出現，而「寄失敗過」正是最需要被記下來的事：
       * 重試三次都失敗，與從未寄過，在畫面上長得一模一樣（計畫書 §3.4）。
       */
      await this.recordFailure({
        accountBookId,
        recordId,
        userId,
        recipientEmail,
        error,
      });

      throw toAppError(error);
    }

    /**
     * Info: (20260904 - Julian) 信已經寄出去了，這一列是它的憑據。
     *
     * 這裡若寫入失敗，就是「寄出去了但沒有紀錄」—— 收不回來，也補不了，
     * 只能讓錯誤照常往上（使用者會看到失敗，而信確實已寄出，這是誤導的），
     * 並在 log 留下足以人工補救的線索。要根治得把寄送與落地放進同一個交易，
     * 而 SMTP 不在資料庫的交易邊界內 —— 那是分散式交易，本次不做。
     */
    return this.deliveries.createDelivery({
      accountBookId,
      salaryRecordId: record.id,
      sentByUserId: userId,
      recipientEmail,
      status: SALARY_DELIVERY_STATUS.SENT as SalaryDeliveryStatus,
      failureReason: null,
    });
  }

  /**
   * Info: (20260904 - Julian) 落地失敗列。**它自己失敗時不能吃掉原本的錯誤。**
   *
   * 沒有這一層 try 的話，資料庫此刻剛好也不通會讓使用者收到一個
   * Prisma 的連線錯誤，而真正的成因（SMTP 掛了）連 log 都不會有。
   */
  private async recordFailure({
    accountBookId,
    recordId,
    userId,
    recipientEmail,
    error,
  }: {
    accountBookId: string;
    recordId: string;
    userId: string;
    recipientEmail: string;
    error: unknown;
  }): Promise<void> {
    const reason = describeError(error);
    logger.error("[SalaryPaySlipDelivery] delivery failed", {
      accountBookId,
      recordId,
      reason,
    });

    try {
      await this.deliveries.createDelivery({
        accountBookId,
        salaryRecordId: recordId,
        sentByUserId: userId,
        recipientEmail,
        status: SALARY_DELIVERY_STATUS.FAILED as SalaryDeliveryStatus,
        failureReason: reason,
      });
    } catch (writeError) {
      logger.error("[SalaryPaySlipDelivery] failed to record the failure", {
        accountBookId,
        recordId,
        reason: describeError(writeError),
      });
    }
  }

  /**
   * Info: (20260904 - Julian) 「已寄出」分頁。
   *
   * `limit` 由呼叫端給且有上限（見 route）—— 不給上限的話，一本累積了幾年
   * 寄送紀錄的帳本會在開啟分頁時把全部列一次撈出來。
   */
  public async listByAccountBook({
    accountBookId,
    limit,
  }: {
    accountBookId: string;
    limit: number;
  }): Promise<ISalaryPaySlipDeliveryListItem[]> {
    return this.deliveries.listByAccountBook({ accountBookId, limit });
  }

  public async listByRecord({
    accountBookId,
    recordId,
  }: {
    accountBookId: string;
    recordId: string;
  }): Promise<ISalaryPaySlipDelivery[]> {
    return this.deliveries.listByRecord({
      accountBookId,
      salaryRecordId: recordId,
    });
  }
}

/**
 * Info: (20260904 - Julian) 正式接線。PDF 用真的服務，寄信用 `mail.service` 的
 * 模組層函式包一層 —— 它是 function 不是 class，包起來才能對上注入的埠。
 */
const paySlipPdfService = new SalaryPaySlipPdfService();

export const salaryPaySlipDeliveryService = new SalaryPaySlipDeliveryService(
  salaryCalculatorEmployeeRepo,
  salaryRecordRepo,
  salaryPaySlipDeliveryRepo,
  paySlipPdfService,
  { send: (message: IMailMessage) => sendMail(message) },
);
