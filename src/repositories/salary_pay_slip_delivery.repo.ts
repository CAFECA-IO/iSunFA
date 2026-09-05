import { Prisma, SalaryPaySlipDelivery, User } from "@/generated";
import { prisma } from "@/lib/prisma";
import {
  SalaryDeliveryStatus,
  truncateFailureReason,
} from "@/constants/salary_delivery";
import {
  ISalaryPaySlipDelivery,
  ISalaryPaySlipDeliveryListItem,
  ISalaryPaySlipDeliveryWriteInput,
} from "@/interfaces/salary_pay_slip_delivery";

/**
 * Info: (20260904 - Julian) 薪資單寄送紀錄的存取層。
 *
 * ## 租戶隔離不靠呼叫端記得
 *
 * 每一支方法都收 `accountBookId`，而且它一律是 `where` 的第一個 key ——
 * 包含以 `salaryRecordId` 查詢的那一支。只用 `salaryRecordId` 查再由呼叫端
 * 比對帳本，是一個猜到別人的 uuid 就能讀到別的帳本收件信箱的設計
 * （同 `salary_calculator_employee.repo.ts` 與 `salary_record.repo.ts`）。
 *
 * ## 這裡不判斷「可不可以寄」
 *
 * 授權、限流、有沒有信箱，全部是 service 與 route 的事。這一層只負責
 * 「把發生過的事情原樣寫下來」——包括失敗。
 */
export interface ISalaryPaySlipDeliveryRepository {
  createDelivery(
    input: ISalaryPaySlipDeliveryWriteInput,
  ): Promise<ISalaryPaySlipDelivery>;
  /** Info: (20260904 - Julian) 某一筆薪資紀錄的寄送歷史，新的在前 */
  listByRecord(params: {
    accountBookId: string;
    salaryRecordId: string;
  }): Promise<ISalaryPaySlipDelivery[]>;
  /** Info: (20260904 - Julian) 整本帳的寄送歷史（「已寄出」分頁），新的在前 */
  listByAccountBook(params: {
    accountBookId: string;
    limit: number;
  }): Promise<ISalaryPaySlipDeliveryListItem[]>;
}

type DeliveryWithSender = SalaryPaySlipDelivery & { sentBy: User };

// Info: (20260904 - Julian) DateTime → Unix 秒，沿用 salary_record.repo 的慣例
const toUnixSeconds = (value: Date): number =>
  Math.floor(value.getTime() / 1000);

const toDelivery = (row: DeliveryWithSender): ISalaryPaySlipDelivery => ({
  id: row.id,
  salaryRecordId: row.salaryRecordId,
  recipientEmail: row.recipientEmail,
  status: row.status as SalaryDeliveryStatus,
  failureReason: row.failureReason,
  sentBy: {
    id: row.sentBy.id,
    /**
     * Info: (20260904 - Julian) `User.name` 可為 null（錢包登入者不一定填過名字）。
     * 回空字串而不是 null：這一欄的唯一讀者是「已寄出」分頁的一格文字，
     * 讓前端去處理 null 只是把同一個 `?? ""` 搬到四個地方。
     */
    name: row.sentBy.name ?? "",
  },
  createdAt: toUnixSeconds(row.createdAt),
});

// Info: (20260904 - Julian) 寄送者只取這三欄：其餘是 PII，而它們沒有讀者
const SENDER_SELECT = {
  select: { id: true, name: true },
} satisfies Prisma.UserDefaultArgs;

export class SalaryPaySlipDeliveryRepository implements ISalaryPaySlipDeliveryRepository {
  public async createDelivery(
    input: ISalaryPaySlipDeliveryWriteInput,
  ): Promise<ISalaryPaySlipDelivery> {
    const row = await prisma.salaryPaySlipDelivery.create({
      data: {
        accountBookId: input.accountBookId,
        salaryRecordId: input.salaryRecordId,
        sentByUserId: input.sentByUserId,
        /**
         * Info: (20260904 - Julian) 收件信箱**由呼叫端把當下的值傳進來**，
         * 不是在這裡 join 員工檔取。那正是這張表存在的理由之一：
         * 員工改了信箱之後，查「這封三月的薪資單當初寄到哪」，
         * join 出來的會是今天的信箱。
         */
        recipientEmail: input.recipientEmail,
        status: input.status,
        failureReason: truncateFailureReason(input.failureReason),
      },
      include: { sentBy: SENDER_SELECT },
    });

    return toDelivery(row as DeliveryWithSender);
  }

  public async listByRecord({
    accountBookId,
    salaryRecordId,
  }: {
    accountBookId: string;
    salaryRecordId: string;
  }): Promise<ISalaryPaySlipDelivery[]> {
    const rows = await prisma.salaryPaySlipDelivery.findMany({
      // Info: (20260904 - Julian) 租戶過濾永遠是 where 的第一個 key
      where: { accountBookId, salaryRecordId },
      include: { sentBy: SENDER_SELECT },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => toDelivery(row as DeliveryWithSender));
  }

  public async listByAccountBook({
    accountBookId,
    limit,
  }: {
    accountBookId: string;
    limit: number;
  }): Promise<ISalaryPaySlipDeliveryListItem[]> {
    const rows = await prisma.salaryPaySlipDelivery.findMany({
      where: { accountBookId },
      include: {
        sentBy: SENDER_SELECT,
        /**
         * Info: (20260904 - Julian) 只取期間與員工的三欄，**不取兩份快照**。
         *
         * `inputSnapshot` / `resultSnapshot` 是整份薪資明細。清單一次撈 50 列，
         * 帶上快照等於把整本帳的薪資結構送進瀏覽器，而畫面上只用得到年月。
         * 點開某一列時再走 `GET record/:record_id`。
         */
        salaryRecord: {
          select: {
            year: true,
            month: true,
            employee: { select: { id: true, name: true, number: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return rows.map((row) => ({
      ...toDelivery(row as unknown as DeliveryWithSender),
      year: row.salaryRecord.year,
      month: row.salaryRecord.month,
      employee: {
        id: row.salaryRecord.employee.id,
        name: row.salaryRecord.employee.name,
        // Info: (20260904 - Julian) 員工編號可空（軟刪後讓出 activeNumber），空字串比 null 好用
        number: row.salaryRecord.employee.number ?? "",
      },
    }));
  }
}

export const salaryPaySlipDeliveryRepo: ISalaryPaySlipDeliveryRepository =
  new SalaryPaySlipDeliveryRepository();
