import { AttendancePunch } from "@/generated";
import { prisma } from "@/lib/prisma";
import { PunchType, PunchVerification } from "@/constants/attendance";
import { HrPiiTable } from "@/constants/hr_pii";
import { assertStorablePii } from "@/repositories/hr_pii_invariant";

/**
 * Info: (20260813 - Julian) 打卡紀錄資料存取層（唯一碰 Prisma）；不含任何業務判斷。
 *
 * ## Append-Only
 *
 * **這支 repository 刻意沒有 `update`、沒有 `delete`、沒有 `upsert`。**
 * 不是「不建議用」，是不寫出來 —— 出勤紀錄是法定文件（⚠️ 條號待法務核對），
 * 可被 UPDATE 的紀錄在稽核上等於沒有紀錄。
 *
 * 打錯卡的處理方式不是改掉那一筆，而是由核准後的補登單產生新紀錄並回頭標記
 * 原紀錄被取代（正式版的 `supersededById`）—— 原紀錄永久保留，
 * 稽核可完整重建「原本打了什麼、誰在何時改成什麼、憑哪張單」。
 *
 * 少寫兩個方法是負成本。這是「demo 階段不該砍的嚴謹」的典型例子。
 */
export interface IAttendancePunchInput {
  /**
   * Info: (20260813 - Julian) 由呼叫端以 `randomUUID()` 產生，**不可省略**。
   *
   * 它是 PII 加密 AAD (`表名:列id:欄位名:代次`) 的一部分，而加密發生在 insert 之前 ——
   * 等資料庫產生就來不及了。schema 因此也刻意沒有 `@default(uuid())`（ADR 018 §3）。
   */
  id: string;
  accountBookId: string;
  employeeId: string;
  punchType: PunchType;
  verification: PunchVerification;
  punchedAt: Date;
  workDate: string;
  workLocationId: string;
  latitudeCipher: string;
  longitudeCipher: string;
  accuracyMeters: number | null;
  distanceMeters: number;
  piiAlgorithm: string;
  piiKeyVersion: number;
}

export interface IAttendancePunchRepository {
  create(input: IAttendancePunchInput): Promise<AttendancePunch>;
  findByEmployeeAndWorkDate(
    accountBookId: string,
    employeeId: string,
    workDate: string,
  ): Promise<AttendancePunch[]>;
  findByWorkDateRange(params: {
    accountBookId: string;
    employeeIds: string[];
    from: string;
    to: string;
  }): Promise<AttendancePunch[]>;
}

class AttendancePunchRepository implements IAttendancePunchRepository {
  /**
   * Info: (20260813 - Julian) 寫入前呼叫 `assertStorablePii`。
   *
   * 走 service 的正常路徑上這條不變式到不了（密文與代次由 `encryptPii()` 的
   * 回傳值一起產生），留著的理由是 repository 是唯一的 DB 閘口 ——
   * 種子腳本、資料遷移、未來的金鑰輪替作業都會經過這裡，
   * 而輪替腳本正是最可能違反、且違反後果最不可逆的地方（ADR 018 §5）。
   */
  public async create(input: IAttendancePunchInput): Promise<AttendancePunch> {
    assertStorablePii(HrPiiTable.ATTENDANCE_PUNCH, {
      ciphers: {
        latitudeCipher: input.latitudeCipher,
        longitudeCipher: input.longitudeCipher,
      },
      keyVersion: input.piiKeyVersion,
      algorithm: input.piiAlgorithm,
    });

    return prisma.attendancePunch.create({ data: input });
  }

  // Info: (20260813 - Julian) 依時間排序：判定引擎不要求順序，但除錯時看得懂
  public async findByEmployeeAndWorkDate(
    accountBookId: string,
    employeeId: string,
    workDate: string,
  ): Promise<AttendancePunch[]> {
    return prisma.attendancePunch.findMany({
      where: { accountBookId, employeeId, workDate },
      orderBy: { punchedAt: "asc" },
    });
  }

  /**
   * Info: (20260813 - Julian) 判定矩陣用：一次取整段期間、整批員工。
   *
   * `workDate` 是 "YYYY-MM-DD" 字串，字典序即日期序，故可直接用 gte / lte。
   * 走 `@@index([accountBookId, employeeId, workDate])` 的前綴。
   *
   * **回傳的是完整的打卡列，含經緯度密文。** 判定只需要 `punchType` 與時刻
   * （見 `IPunchSnapshot`），因此呼叫端必須在 service 層就投影掉其餘欄位 ——
   * 讓密文一路流到 API 回應是這個模組最容易犯、也最不可逆的錯。
   */
  public async findByWorkDateRange(params: {
    accountBookId: string;
    employeeIds: string[];
    from: string;
    to: string;
  }): Promise<AttendancePunch[]> {
    const { accountBookId, employeeIds, from, to } = params;
    if (employeeIds.length === 0) return [];

    return prisma.attendancePunch.findMany({
      where: {
        accountBookId,
        employeeId: { in: employeeIds },
        workDate: { gte: from, lte: to },
      },
      orderBy: { punchedAt: "asc" },
    });
  }
}

export const attendancePunchRepo = new AttendancePunchRepository();
