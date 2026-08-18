import { collectDepartmentScope } from "@/lib/utils/hr_dashboard";
import { IDepartment } from "@/interfaces/hr_management";
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
  departmentId: string | null;
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
  unlinkUser(employeeId: string): Promise<boolean>;
  findRosterInPeriod(params: {
    accountBookId: string;
    from: string;
    to: string;
    employeeId?: string;
    departmentId?: string;
  }): Promise<IAttendanceRosterRow[]>;
  findByIdInAccountBook(
    accountBookId: string,
    employeeId: string,
  ): Promise<Employee | null>;
  /**
   * Info: (20260818 - Julian) 顯示用的員工檔：工號、姓名、職稱、部門名稱。
   *
   * 只有 Tier 1 欄位（同事之間本來就看得到的）。電話與信箱不在這裡 ——
   * 那些是 Tier 2，要走專屬端點並留下 `AuditLog`（ADR 018 §6）。
   */
  findProfile(params: { accountBookId: string; employeeId: string }): Promise<{
    employeeNo: string;
    name: string;
    jobTitle: string | null;
    departmentName: string | null;
  } | null>;

  // Info: (20260817 - Julian) 「他是不是主管」——顯示用；授權請用 managesEmployee
  isDepartmentManager(params: {
    accountBookId: string;
    employeeId: string;
  }): Promise<boolean>;
  // Info: (20260817 - Julian) 「他管不管得到這個人」——授權用，比對部門子樹
  managesEmployee(params: {
    accountBookId: string;
    managerEmployeeId: string;
    targetEmployeeId: string;
  }): Promise<boolean>;
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
   * Info: (20260814 - Julian) 解除綁定，同樣是條件式更新：`where` 帶 `userId: { not: null }`，
   * 回傳 `false` 代表「本來就沒綁」而不是失敗。供人事的 CLI escape hatch 使用（`link_employee_user --unlink`）。
   */
  public async unlinkUser(employeeId: string): Promise<boolean> {
    const result = await prisma.employee.updateMany({
      where: { id: employeeId, userId: { not: null } },
      data: { userId: null },
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
    departmentId?: string;
  }): Promise<IAttendanceRosterRow[]> {
    const { accountBookId, from, to, employeeId, departmentId } = params;

    // Info: (20260813 - Julian) 到職日落在 `to` 當天仍算重疊，故比到隔日 00:00
    const periodEnd = new Date(`${to}T00:00:00.000Z`);
    periodEnd.setUTCDate(periodEnd.getUTCDate() + 1);

    return prisma.employee.findMany({
      where: {
        accountBookId,
        ...(employeeId ? { id: employeeId } : {}),
        ...(departmentId ? { departmentId } : {}),
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
        departmentId: true,
        department: { select: { name: true } },
        jobTitle: { select: { title: true } },
      },
      orderBy: { employeeNo: "asc" },
    });
  }

  /**
   * Info: (20260813 - Julian) 帳本內查單一員工。**查詢一律綁帳本。**
   *
   * 排班寫入拿到的 `employeeId` 來自請求本體，而 `EmployeeShiftDay`
   * 在資料庫層沒有「員工必須屬於同一帳本」的約束 —— 光用 id 查得到就寫下去，
   * 等於任何一個登入者都能替別家公司的員工排班。
   */
  public async findByIdInAccountBook(
    accountBookId: string,
    employeeId: string,
  ): Promise<Employee | null> {
    return prisma.employee.findFirst({
      where: { id: employeeId, accountBookId },
    });
  }
  /**
   * Info: (20260813 - Julian) 這個人是不是任一部門的主管。
   *
   * **這不是權限矩陣**，是計畫書 §8.5 的視野分級 —— 決定「看不看得到圍欄地圖」
   * 與「畫面上顯不顯示銷假徵詢按鈕」。正式版的權限控制仍然是 §7.3 第 1 順位，
   * 而它會取代這個方法，不是建立在它之上。
   *
   * 用 `Department.managerId` 而不是職稱字串：職稱是自由文字，
   * 「工地主任」與「工地主任(代)」在字串比對下是兩個人，而在組織圖上是同一件事。
   *
   * ⚠️ Info: (20260817 - Julian) **這個方法回答的是「他是不是主管」，
   * 不是「他管不管得到某個人」。** 拿它當授權判斷會放行跨部門的操作 ——
   * 第一工務段的主管可以對第五工務段的員工發起銷假徵詢。
   * 需要後者請用 `managesEmployee()`。
   *
   * 兩個都留著是刻意的：顯示按鈕與允許動作是兩個不同的問題，
   * 用同一個答案回答它們，正是這次那個缺口的成因。
   */
  public async findProfile(params: {
    accountBookId: string;
    employeeId: string;
  }): Promise<{
    employeeNo: string;
    name: string;
    jobTitle: string | null;
    departmentName: string | null;
  } | null> {
    const row = await prisma.employee.findFirst({
      where: { id: params.employeeId, accountBookId: params.accountBookId },
      select: {
        employeeNo: true,
        name: true,
        // Info: (20260818 - Julian) 兩個外鍵都是 SetNull，因此都要能是 null
        jobTitle: { select: { title: true } },
        department: { select: { name: true } },
      },
    });
    if (row === null) return null;

    return {
      employeeNo: row.employeeNo,
      name: row.name,
      jobTitle: row.jobTitle?.title ?? null,
      departmentName: row.department?.name ?? null,
    };
  }

  public async isDepartmentManager(params: {
    accountBookId: string;
    employeeId: string;
  }): Promise<boolean> {
    const count = await prisma.department.count({
      where: {
        accountBookId: params.accountBookId,
        managerId: params.employeeId,
      },
    });
    return count > 0;
  }

  /**
   * Info: (20260817 - Julian) 這個主管管不管得到那位員工。**這是授權判斷。**
   *
   * ## 為什麼要用子樹而不是直屬部門
   *
   * 工程處長掛在 DEP-000（根），他的下屬分散在各工務段。只比對直屬部門
   * 會讓他管不到任何人 —— 而組織圖上他管所有人。
   *
   * ## 為什麼在這裡撈全部門而不是遞迴查詢
   *
   * 一個帳本的部門數是數十量級，一次撈完在記憶體算，比在 DB 上做遞迴 CTE
   * 便宜也好懂。範圍計算沿用 `collectDepartmentScope` —— 前端儀表板已經在用
   * 同一支純函數（含防環：部門資料有環時反覆掃描不會堆爆），
   * 兩邊各寫一份就會出現「主管在畫面上看得到、在後端被擋下」這種矛盾。
   *
   * ## `Department.managerId` 是 @unique
   *
   * 因此一個人最多掛一個部門的主管，這裡取 `findFirst` 即可。
   * ToDo: (20260817 - Julian) 一人兼管兩個工務段在工程公司很常見，
   * 而現行資料模型表達不了（接線守則 §3.5.2、待辦乙-4）。放寬成多對多之後，
   * 這裡要改成把每個被管部門的子樹聯集起來。
   */
  public async managesEmployee(params: {
    accountBookId: string;
    managerEmployeeId: string;
    targetEmployeeId: string;
  }): Promise<boolean> {
    // Info: (20260817 - Julian) 管自己不算 —— 職責分離的第一條（ADR 023 §5）
    if (params.managerEmployeeId === params.targetEmployeeId) return false;

    const managed = await prisma.department.findFirst({
      where: {
        accountBookId: params.accountBookId,
        managerId: params.managerEmployeeId,
      },
      select: { id: true },
    });
    if (!managed) return false;

    const target = await prisma.employee.findFirst({
      where: {
        id: params.targetEmployeeId,
        accountBookId: params.accountBookId,
      },
      select: { departmentId: true },
    });
    /**
     * Info: (20260817 - Julian) 沒有部門的員工不屬於任何主管的範圍。
     * 回 false 而不是 true：`Employee.departmentId` 是 `onDelete: SetNull`，
     * 部門一被刪除，底下的人就全部變成 null —— 若這裡放行，
     * 刪一個部門會讓所有主管突然管得到那些人。
     */
    if (!target?.departmentId) return false;

    const departments = await prisma.department.findMany({
      where: { accountBookId: params.accountBookId },
      select: { id: true, parentId: true },
    });

    return collectDepartmentScope(departments as IDepartment[], managed.id).has(
      target.departmentId,
    );
  }

  /**
   * Info: (20260818 - Julian) 我管得到的所有員工 id（不含自己）。**這是授權判斷的複數版。**
   *
   * ## 為什麼需要一個複數版
   *
   * `managesEmployee` 答的是「這個人歸不歸我管」，一次一個。主管要看
   * 「有誰送了加班單等我簽」時，問的是反方向：先有範圍，才有清單。
   * 拿單數版去對全帳本每個人跑一次，是 N 次部門樹走訪。
   *
   * ## 為什麼不是兩套邏輯
   *
   * 兩者都走同一條路：`Department.managerId` 找到我管的部門 →
   * `collectDepartmentScope` 展開子樹 → 取該子樹裡的員工。若哪天放寬成
   * 一人可管多部門（待辦乙-4），兩支要一起改 —— 而它們現在讀起來就是同一件事。
   *
   * 不含自己：職責分離的第一條（ADR 023 §5）—— 自己的單子不會出現在
   * 自己的待簽清單裡。
   */
  public async listManagedEmployeeIds(params: {
    accountBookId: string;
    managerEmployeeId: string;
  }): Promise<string[]> {
    const managed = await prisma.department.findFirst({
      where: {
        accountBookId: params.accountBookId,
        managerId: params.managerEmployeeId,
      },
      select: { id: true },
    });
    if (!managed) return [];

    const departments = await prisma.department.findMany({
      where: { accountBookId: params.accountBookId },
      select: { id: true, parentId: true },
    });
    const scope = collectDepartmentScope(
      departments as IDepartment[],
      managed.id,
    );

    const employees = await prisma.employee.findMany({
      where: {
        accountBookId: params.accountBookId,
        departmentId: { in: [...scope] },
        id: { not: params.managerEmployeeId },
      },
      select: { id: true },
    });
    return employees.map((employee) => employee.id);
  }
}

export const employeeRepo = new EmployeeRepository();
