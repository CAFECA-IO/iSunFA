import { Employee } from "@/generated";
import { prisma } from "@/lib/prisma";

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
}

export const employeeRepo = new EmployeeRepository();
