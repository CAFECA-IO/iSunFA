import { Employee } from "@/generated";
import { prisma } from "@/lib/prisma";

/**
 * Info: (20260813 - Julian) 出勤名冊的一列。**刻意不是 `Employee`。**
 *
 * `Employee` 帶著身分證、生日、地址、個人信箱的密文（ADR 018 Tier 1／Tier 2）。
 * 判定矩陣要的只有工號、姓名、部門、職稱四個欄位，而這裡用 Prisma 的
 * `select` 把其餘欄位**擋在查詢層**，不是撈回來再於 service 挑掉 ——
 * 後者「今天挑對了」，明天有人 `...employee` 展開一次就把密文送進 API 回應，
 * 而那種錯誤在 code review 裡看起來只是一行順手的展開。
 *
 * 型別上做不到的事，就不會有人不小心做到（ADR 019）。
 */
export interface IAttendanceRosterRow {
  id: string;
  employeeNo: string;
  name: string;
  department: { name: string } | null;
  jobTitle: { title: string } | null;
}

/**
 * Info: (20260813 - Julian) 員工檔資料存取層（唯一碰 Prisma）；不含任何業務判斷。
 *
 * 人事模組原本沒有 repository —— 前端頁面吃的是 `constants/mock_hr_*.ts` 的假資料。
 * 這是第一支，因此只放簽到系統目前確實用得到的三個方法，不做預想中的 CRUD。
 */
export interface IEmployeeRepository {
  findByUserId(userId: string): Promise<Employee | null>;
  findByAccountBookAndEmails(
    accountBookId: string,
    emails: string[],
  ): Promise<Employee[]>;
  linkUser(employeeId: string, userId: string): Promise<boolean>;
  findRosterInPeriod(params: {
    accountBookId: string;
    from: string;
    to: string;
    employeeId?: string;
  }): Promise<IAttendanceRosterRow[]>;
}

class EmployeeRepository implements IEmployeeRepository {
  public async findByUserId(userId: string): Promise<Employee | null> {
    return prisma.employee.findUnique({ where: { userId } });
  }

  /**
   * Info: (20260813 - Julian) 以公司信箱找出可綁定的員工檔，**大小寫不敏感**。
   *
   * `@@unique([accountBookId, email])` 是大小寫敏感的，因此理論上可能存在
   * 只差大小寫的兩筆。這裡刻意回傳陣列而不是單筆，把「找到幾筆」交給
   * service 判斷 —— 在這種情況下綁到其中任意一筆，等於讓某人以另一個人的身分打卡，
   * 而 repository 沒有立場替這個決定負責。
   */
  public async findByAccountBookAndEmails(
    accountBookId: string,
    emails: string[],
  ): Promise<Employee[]> {
    if (emails.length === 0) return [];

    return prisma.employee.findMany({
      where: {
        accountBookId,
        OR: emails.map((email) => ({
          email: { equals: email, mode: "insensitive" as const },
        })),
      },
    });
  }

  /**
   * Info: (20260813 - Julian) 綁定系統帳號。**條件式更新，不是無條件寫入。**
   *
   * `where` 帶 `userId: null`，讓「這筆還沒被綁走」成為更新的條件本身 ——
   * 先查再寫會有一個檢查與寫入之間的空窗，兩個分頁同時首登就會後者覆蓋前者。
   * 回傳 `count === 1` 讓 service 能區分「綁成功」與「被別人搶先」，
   * 而不必自己再查一次去猜。
   */
  public async linkUser(employeeId: string, userId: string): Promise<boolean> {
    const result = await prisma.employee.updateMany({
      where: { id: employeeId, userId: null },
      data: { userId },
    });
    return result.count === 1;
  }

  /**
   * Info: (20260813 - Julian) 判定矩陣的名冊：期間內**在職期間有重疊**的員工。
   *
   * ## 為什麼用到離職日而不是 `status`
   *
   * `status` 是「現在」的狀態。用它篩選，上個月的出勤總覽會少掉這個月才離職的人 ——
   * 而那個人上個月確實有出勤義務、也確實有紀錄。出勤是歷史事實，
   * 篩選歷史事實要用當時的條件，不是用今天的標籤。
   *
   * 反過來也一樣：下週才報到的新人不該出現在本月的矩陣裡。他不是曠職，
   * 是還沒有出勤義務 —— 而一格「無排班」放在他名下，仍然是在暗示他該來而沒來。
   *
   * ## 邊界的處置
   *
   * `hireDate` / `leaveDate` 存的是 `DateTime`，但語意是日曆日。這裡以 UTC 午夜
   * 換算，與 `Asia/Taipei` 差 8 小時 —— 影響只及於「到職當天」「離職當天」這兩格，
   * 而**兩邊都取寬**（含頭含尾）。取寬的後果是多列一個人、那一天顯示為無排班；
   * 取嚴的後果是漏掉一個真的有打卡的人。前者看得出來，後者看不出來。
   */
  public async findRosterInPeriod(params: {
    accountBookId: string;
    from: string;
    to: string;
    employeeId?: string;
  }): Promise<IAttendanceRosterRow[]> {
    const { accountBookId, from, to, employeeId } = params;

    // Info: (20260813 - Julian) 到職日落在 `to` 當天仍算重疊，故比到隔日 00:00
    const periodEnd = new Date(`${to}T00:00:00.000Z`);
    periodEnd.setUTCDate(periodEnd.getUTCDate() + 1);

    return prisma.employee.findMany({
      where: {
        accountBookId,
        ...(employeeId ? { id: employeeId } : {}),
        hireDate: { lt: periodEnd },
        OR: [
          { leaveDate: null },
          { leaveDate: { gte: new Date(`${from}T00:00:00.000Z`) } },
        ],
      },
      select: {
        id: true,
        employeeNo: true,
        name: true,
        department: { select: { name: true } },
        jobTitle: { select: { title: true } },
      },
      orderBy: { employeeNo: "asc" },
    });
  }
}

export const employeeRepo = new EmployeeRepository();
