import { WorkLocation } from "@/generated";
import { prisma } from "@/lib/prisma";

/**
 * Info: (20260813 - Julian) 打卡地點資料存取層（唯一碰 Prisma）；不含任何業務判斷。
 *
 * 刻意不提供 `delete`：地點被刪除會讓歷史打卡的 `workLocationId` 失去指向，
 * 而 schema 用 `onDelete: Restrict` 讓那件事在資料庫層就失敗。
 * 停用地點的正確做法是設定有效期（正式版欄位），不是刪除 ——
 * 刪掉一個地點等於靜默改寫過去的出勤事實。
 */
export interface IWorkLocationRepository {
  findByAccountBook(accountBookId: string): Promise<WorkLocation[]>;
  findById(id: string): Promise<WorkLocation | null>;
}

class WorkLocationRepository implements IWorkLocationRepository {
  public async findByAccountBook(
    accountBookId: string,
  ): Promise<WorkLocation[]> {
    return prisma.workLocation.findMany({
      where: { accountBookId },
      orderBy: { code: "asc" },
    });
  }

  public async findById(id: string): Promise<WorkLocation | null> {
    return prisma.workLocation.findUnique({ where: { id } });
  }
}

export const workLocationRepo = new WorkLocationRepository();
