/**
 * Info: (20260820 - Julian) 正式帳本的第一位 `HR_ADMIN`（review 第 4 輪第 4 條）。
 *
 * ## 為什麼需要一支腳本
 *
 * 假勤模組的每一支設定端點都要求操作者具 `HR_ADMIN`（假別設定 L2–L6、
 * 簽核規則、加班政策、額度調整 L9、額度授予 L33），而 `HR_ADMIN` 記在
 * `EmployeeHrFunctionAssignment` —— 一張隨本次變更新增、上線當下**空的**表。
 *
 * 而產品裡**沒有任何端點可以指派職能**（`employeeHrFunctionRepo.grant()`
 * 存在，但沒有 route 呼叫它）。於是全新的正式帳本會卡在一個死結：
 *
 * ```
 * 要設定假別 → 需要 HR_ADMIN
 * 要有 HR_ADMIN → 需要有人指派
 * 要指派 → 需要一支不存在的端點
 * ```
 *
 * demo 帳本沒有這個問題，因為 `seed_attendance_demo.ts` 直接寫進去了 ——
 * 而那正是它在 review 之前沒有被發現的原因：開發與 demo 都走 seed。
 *
 * ## 為什麼只在「一位都沒有」時才動作
 *
 * 這支腳本繞過了整個授權層。留著它無條件可用，等於在產品旁邊放一條
 * 永久的後門，而後門的使用不會出現在任何簽核軌跡裡。
 * 限制成「只有在該帳本尚無任何 `HR_ADMIN` 時」，它就只是一次性的引導 ——
 * 第二位以後必須由第一位透過產品指派（**而那支端點還沒有做**）。
 *
 * ToDo: (20260820 - Julian) 人事職能的指派端點與畫面落地之後，
 * 這支腳本的定位要重新檢討 —— 屆時它應該只剩「災難復原」一個用途。
 *
 * ## 用法
 *
 * ```bash
 * npx tsx scripts/bootstrap_hr_admin.ts <account_book_id> <employee_no>
 * ```
 */

/**
 * Info: (20260820 - Julian) 走 `@/lib/prisma` 的那一個 client（同兩支 seed）——
 * 自己 `new PrismaClient()` 會繞過資料庫邊界防護（CLAUDE.md §2），
 * 而這支腳本寫的是授權資料，最不該是唯一一個沒有防護的寫入者。
 */
import { prisma } from "@/lib/prisma";
import { EmployeeHrFunction } from "@/constants/hr_management";
import { employeeHrFunctionRepo } from "@/repositories/employee_hr_function.repo";

/**
 * Info: (20260820 - Julian) 用工號而不是 employee id：跑這支腳本的人手上有的是
 * 人事系統裡的工號，而 id 是一個他必須先去資料庫查的 uuid ——
 * 多一次手動查詢就多一次貼錯人的機會，而貼錯的後果是把 HR_ADMIN 給了別人。
 */
async function main(): Promise<void> {
  const [accountBookId, employeeNo] = process.argv.slice(2);
  if (!accountBookId || !employeeNo) {
    console.error(
      "用法：npx tsx scripts/bootstrap_hr_admin.ts <account_book_id> <employee_no>",
    );
    process.exitCode = 1;
    return;
  }

  const existing = await employeeHrFunctionRepo.listHolderIds({
    accountBookId,
    hrFunction: EmployeeHrFunction.HR_ADMIN,
  });
  if (existing.length > 0) {
    /**
     * Info: (20260820 - Julian) 中止而不是靜默略過。
     *
     * 靜默略過會讓「我跑過了，怎麼還是沒權限」變成一個查不出來的狀態
     * （同 `seed_leave_overtime_demo.ts` 對依賴缺失的處置）。
     */
    console.error(
      `此帳本已經有 ${existing.length} 位 HR_ADMIN。這支腳本只負責**第一位** ——\n` +
        `第二位以後請由既有的 HR_ADMIN 指派（若該端點尚未落地，請先撤銷舊的職能）。`,
    );
    process.exitCode = 1;
    return;
  }

  const employee = await prisma.employee.findFirst({
    where: { accountBookId, employeeNo },
    select: { id: true, employeeNo: true, name: true },
  });
  if (employee === null) {
    console.error(`帳本 ${accountBookId} 找不到工號 ${employeeNo} 的員工。`);
    process.exitCode = 1;
    return;
  }

  /**
   * Info: (20260820 - Julian) 走 repository 而不是直接 `prisma.create`：
   * `assertStorableHrFunctionAssignment` 與 `activeKey` 的組法都在那一層，
   * 繞過去等於讓引導出來的第一位 HR_ADMIN 是一筆不符合不變式的資料。
   *
   * `grantedByEmployeeId` 為 null 代表**系統**（同 `accrueForEmployee` 對
   * `actorEmployeeId: null` 的既有語意）—— 這一筆確實不是任何人在產品裡按的。
   */
  await employeeHrFunctionRepo.grant({
    accountBookId,
    employeeId: employee.id,
    hrFunction: EmployeeHrFunction.HR_ADMIN,
    grantedByEmployeeId: null,
    grantedByEmployeeNo: "SYSTEM",
    grantedByName: "bootstrap_hr_admin.ts",
    grantReason:
      "帳本初始化：第一位 HR_ADMIN，由部署檢查表 §三之二 的引導步驟指派",
  });

  console.log(
    `已指派 HR_ADMIN：${employee.employeeNo} ${employee.name}（帳本 ${accountBookId}）`,
  );
  console.log(
    "下一步：由這位人事設定假別、簽核規則與加班政策，再對每位員工跑一次 L33 授予。",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
