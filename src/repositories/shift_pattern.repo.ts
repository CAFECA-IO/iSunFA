import { ShiftPattern } from "@/generated";
import { prisma } from "@/lib/prisma";

/**
 * Info: (20260813 - Julian) 班別資料存取層（唯一碰 Prisma）；不含任何業務判斷。
 *
 * 刻意不提供 `delete`：班別被刪除會讓歷史排班失去比較基準，而 schema 用
 * `onDelete: Restrict` 讓那件事在資料庫層就失敗。停用班別的正確做法是
 * 設定有效期（正式版欄位），不是刪除 —— 刪掉一個班別等於靜默改寫
 * 過去每一天的遲到早退判定。
 */
export interface IShiftPatternRepository {
  findByAccountBook(accountBookId: string): Promise<ShiftPattern[]>;
  findByIdInAccountBook(
    accountBookId: string,
    id: string,
  ): Promise<ShiftPattern | null>;
}

class ShiftPatternRepository implements IShiftPatternRepository {
  public async findByAccountBook(
    accountBookId: string,
  ): Promise<ShiftPattern[]> {
    return prisma.shiftPattern.findMany({
      where: { accountBookId },
      orderBy: { code: "asc" },
    });
  }

  /**
   * Info: (20260813 - Julian) 查詢一律綁帳本，**不提供只用 id 的版本**。
   *
   * `EmployeeShiftDay.shiftPatternId` 在資料庫層沒有任何跨帳本約束 ——
   * 光靠 id 查得到就寫下去，等於讓 A 帳本的排班掛上 B 帳本的班別。
   * 那不是「查錯資料」，是租戶隔離破了一個洞，而它只會在
   * 有人發現自己的班表出現沒看過的班次時才被發現。
   *
   * 把 `accountBookId` 做成參數而不是呼叫端自己比對，是因為
   * 「忘了比對」不會有任何症狀，而少一個方法不會。
   */
  public async findByIdInAccountBook(
    accountBookId: string,
    id: string,
  ): Promise<ShiftPattern | null> {
    return prisma.shiftPattern.findFirst({ where: { id, accountBookId } });
  }
}

export const shiftPatternRepo = new ShiftPatternRepository();
